// Popula uma ficha de fatiamento (product_slicing_sheets) para cada peça do
// catálogo que já tenha um cálculo de preço vinculado, reaproveitando o
// peso/tempo/impressora já registrados naquele cálculo — para que a tela de
// fila de impressão (/producao/fila-de-impressao) já tenha peças elegíveis
// para adicionar à fila logo após `make dev`, sem exigir cadastro manual.
//
// Pré-requisito: `npm run seed-pricing` (impressora + parâmetros) e
// `npm run seed-catalog` (peças com cálculo vinculado) já terem rodado.
// Uso recomendado apenas em ambiente local (`npm run seed-slicing-sheets`,
// com o Supabase local rodando via `npm run supabase:start`).
//
// Idempotente: usa SlicingSheetService.upsertSheet, que substitui a ficha
// existente para o mesmo par (produto, impressora) em vez de duplicar — ver
// Requirement "Uma ficha por combinação peça+impressora".
//
// AVISO: o desperdício de suporte aqui é estimado (15% do peso da peça) só
// para dar um número plausível de exemplo — não é um valor real de
// fatiadora. Revise pela tela do produto antes de usar como referência real.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { UserService } from "../src/lib/services/user-service";
import { SlicingSheetService } from "../src/lib/services/slicing-sheet-service";
import type { Database } from "../src/lib/supabase/database.types";

// Client isolado com a service_role key — mesma justificativa de
// scripts/seed-roles.ts (o módulo admin.ts importa "server-only", que lança
// erro fora do bundler do Next).
function createSeedAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const SUPPORT_WASTE_RATIO = 0.15;

async function main() {
  console.log("Iniciando seed de fichas de fatiamento...\n");

  const adminClient = createSeedAdminClient();
  const repositories = createRepositories(adminClient);
  const userService = new UserService(repositories);
  const slicingSheetService = new SlicingSheetService(repositories);

  const existingUsers = await userService.listUsers();
  const owner = existingUsers.find((user) => user.userType === "owner") ?? null;

  const filamentMaterial = (await repositories.materials.findAll()).find(
    (material) => material.type === "filamento",
  );
  if (!filamentMaterial) {
    throw new Error('Nenhum insumo do tipo "filamento" encontrado. Rode "npm run seed-inventory" antes deste seed.');
  }

  const products = await repositories.products.findAll();
  const allPrinters = await repositories.printers.findAll();
  const printerById = new Map(allPrinters.map((printer) => [printer.id, printer]));

  for (const product of products) {
    if (!product.priceCalculationId) {
      console.log(`  - peça "${product.name}" sem cálculo de preço vinculado — ficha não gerada.`);
      continue;
    }

    const calculation = await repositories.priceCalculations.findById(product.priceCalculationId);
    if (!calculation) {
      console.log(`  - peça "${product.name}": cálculo vinculado não encontrado — ficha não gerada.`);
      continue;
    }
    if (calculation.weightGrams === null || calculation.printHours === null || calculation.printerId === null) {
      console.log(`  - peça "${product.name}": cálculo vinculado é de peça composta (sem peso/tempo/impressora) — ficha não gerada.`);
      continue;
    }

    const printer = printerById.get(calculation.printerId);
    if (!printer) {
      console.log(`  - peça "${product.name}": impressora do cálculo vinculado não encontrada — ficha não gerada.`);
      continue;
    }

    const pieceGrams = Math.round(calculation.weightGrams * 100) / 100;
    const supportGrams = Math.round(calculation.weightGrams * SUPPORT_WASTE_RATIO * 100) / 100;

    await slicingSheetService.upsertSheet({
      productId: product.id,
      printerId: printer.id,
      printHours: calculation.printHours,
      materials: [{ materialId: filamentMaterial.id, pieceGrams, supportGrams }],
      createdBy: owner?.id ?? null,
    });

    console.log(
      `  - ficha de "${product.name}" na impressora "${printer.name}" criada/atualizada ` +
        `(${pieceGrams}g na peça + ${supportGrams}g em suporte, ${calculation.printHours}h).`,
    );
  }

  console.log("\nSeed concluído.");
  console.log(
    "AVISO: as gramas de suporte são uma estimativa de exemplo (15% do peso da peça), não um valor real " +
      "de fatiadora — revise pela tela /producao/catalogo/[productId] antes de usar em produção.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nErro ao rodar o seed:", error);
    process.exit(1);
  });
