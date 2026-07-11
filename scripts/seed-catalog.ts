// Popula um catálogo de exemplo (peças + cálculo de preço vinculado +
// listagem em todos os canais + estoque inicial de peças prontas), para que
// as telas de Catálogo, Precificação e Estoque de peças tenham dado real
// para navegar logo após `make dev`, sem exigir cadastro manual.
//
// Pré-requisito: `npm run seed-pricing` já ter rodado (usa a impressora
// Ender-3 V3 SE, os parâmetros de custo e as taxas por canal cadastrados
// por ele). Uso recomendado apenas em ambiente local (`npm run seed-catalog`,
// com o Supabase local rodando via `npm run supabase:start`).
//
// Idempotente: peças são identificadas por nome — se já existir uma peça
// com o mesmo nome, ela é mantida e nenhum cálculo/listagem/estoque novo é
// gerado para ela.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { UserService } from "../src/lib/services/user-service";
import { PricingService } from "../src/lib/services/pricing-service";
import { CatalogService } from "../src/lib/services/catalog-service";
import { InventoryService } from "../src/lib/services/inventory-service";
import type { Database } from "../src/lib/supabase/database.types";
import type { ProductCategory } from "../src/types/catalog";

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

const ENDER_3_V3_SE = "Ender-3 V3 SE";

// Peso/tempo usam os pontos de referência já documentados em
// scripts/seed-pricing.ts (P ~15g/~2,1h, M ~35g/~4,2h, G ~80g/~8,4h), então
// caem sem ambiguidade dentro das faixas de porte semeadas por aquele
// script — não há necessidade de escolher um chosenTier manualmente aqui.
const PRODUCT_DEFS: Array<{
  name: string;
  description: string;
  category: ProductCategory;
  weightGrams: number;
  printHours: number;
  initialStock: number;
}> = [
  {
    name: "Miniatura Guardião de Pedra",
    description: "Miniatura colecionável de porte P, peça autoral da linha de miniaturas coloridas.",
    category: "miniatura_colecionavel",
    weightGrams: 15,
    printHours: 2.1,
    initialStock: 6,
  },
  {
    name: "Suporte de Celular Utilitário",
    description: "Suporte de mesa para celular, peça de linha utilitária de porte M.",
    category: "utilitario",
    weightGrams: 35,
    printHours: 4.2,
    initialStock: 4,
  },
  {
    name: "Vaso Personalizado com Nome",
    description: "Vaso decorativo personalizável (nome/cor sob encomenda), porte G.",
    category: "personalizado",
    weightGrams: 80,
    printHours: 8.4,
    initialStock: 2,
  },
  {
    name: "Leon Colecionável - Edição Padrão",
    description: "Peça da linha autoral Leon, porte M, edição padrão sem customização de cor.",
    category: "linha_leon",
    weightGrams: 35,
    printHours: 4.2,
    initialStock: 3,
  },
];

async function main() {
  console.log("Iniciando seed de catálogo de exemplo...\n");

  const adminClient = createSeedAdminClient();
  const repositories = createRepositories(adminClient);
  const userService = new UserService(repositories);
  const pricingService = new PricingService(repositories);
  const catalogService = new CatalogService(repositories);
  const inventoryService = new InventoryService(repositories);

  const existingUsers = await userService.listUsers();
  const owner = existingUsers.find((user) => user.userType === "owner") ?? null;

  const printers = await repositories.printers.findActive();
  const printer = printers.find((p) => p.name === ENDER_3_V3_SE);
  if (!printer) {
    throw new Error(
      `Impressora "${ENDER_3_V3_SE}" não encontrada. Rode "npm run seed-pricing" antes deste seed.`,
    );
  }

  const existingProducts = await repositories.products.findAll();
  const existingByName = new Map(existingProducts.map((product) => [product.name, product]));

  for (const def of PRODUCT_DEFS) {
    if (existingByName.has(def.name)) {
      console.log(`  - peça "${def.name}" já existia — mantida.`);
      continue;
    }

    const calculation = await pricingService.calculateAndSavePrice({
      weightGrams: def.weightGrams,
      printHours: def.printHours,
      printerId: printer.id,
      createdBy: owner?.id ?? null,
    });

    const product = await catalogService.createProduct({
      name: def.name,
      description: def.description,
      category: def.category,
      createdBy: owner?.id ?? null,
    });

    // Vincula o cálculo (define porte + gera listagem inicial em todos os
    // canais com taxa cadastrada, no preço sugerido) e ativa a peça, para
    // que ela já apareça nas telas de Catálogo/Disponibilidade sem exigir
    // edição manual.
    await catalogService.linkPriceCalculation(product.id, calculation.id);
    await catalogService.updateProduct(product.id, { status: "ativo" });

    await inventoryService.registerProductMovement({
      productId: product.id,
      quantity: def.initialStock,
      movementType: "producao",
      notes: "Estoque inicial de exemplo (seed-catalog).",
      createdBy: owner?.id ?? null,
    });

    console.log(`  - peça "${def.name}" criada (calculada, listada em todos os canais, ${def.initialStock} un. em estoque).`);
  }

  console.log("\nSeed concluído.");
  console.log(
    "AVISO: peças, preços e estoque acima são dados de exemplo para desenvolvimento local — " +
      "revise/ajuste pelas telas /producao/catalogo e /producao/estoque antes de usar em produção.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nErro ao rodar o seed:", error);
    process.exit(1);
  });
