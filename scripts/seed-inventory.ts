// Popula o estoque inicial de insumos a partir do valor de referência hoje
// documentado em camu-docs/03-financeiro/investimento-inicial.md (3kg de
// filamento PLA genérico, ~R$90/kg) e do custo de embalagem já usado em
// cost_parameters (ver scripts/seed-pricing.ts), além de limites mínimos
// para que o indicador de estoque baixo (topbar) já tenha algo para
// mostrar em um ambiente novo, sem exigir configuração manual.
// Uso recomendado apenas em ambiente local (`npm run seed-inventory`, com o
// Supabase local rodando via `npm run supabase:start`).
//
// Idempotente: cada material é upsertado por nome antes de inserir, a
// movimentação de compra inicial só é criada se o material ainda não tiver
// nenhuma movimentação registrada (a tabela é append-only, sem chave de
// upsert própria), e o limite mínimo usa upsert por material_id.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { UserService } from "../src/lib/services/user-service";
import { InventoryService } from "../src/lib/services/inventory-service";
import type { Database } from "../src/lib/supabase/database.types";
import type { MaterialType } from "../src/types/inventory";

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

// A embalagem entra propositalmente abaixo do próprio limite mínimo (saldo
// 20 < 50) para que o indicador de estoque baixo da topbar já apareça em um
// ambiente recém-inicializado, sem precisar simular uma queda de estoque
// manualmente. O filamento fica acima do limite (saldo 3kg >= 1kg) para
// mostrar o contraste (insumo saudável vs. insumo em alerta).
// `unit` é a unidade do reference_cost (R$/unit). Para filamento, o saldo de
// estoque é sempre em gramas (unidade canônica — ver design.md decisão 6 do
// change precificacao-de-pecas-em-partes), então initialPurchase e
// minimumQuantity de filamento são informados em gramas: 3kg = 3000g,
// limite mínimo 1kg = 1000g. `stockUnit` é só o rótulo do saldo nos logs.
const MATERIAL_DEFS: Array<{
  name: string;
  type: MaterialType;
  unit: string;
  stockUnit: string;
  referenceCost: number;
  initialPurchase: number;
  minimumQuantity: number;
  purchaseNotes: string;
}> = [
  {
    name: "Filamento PLA genérico",
    type: "filamento",
    unit: "kg",
    stockUnit: "g",
    referenceCost: 90,
    initialPurchase: 3000,
    minimumQuantity: 1000,
    purchaseNotes: "Investimento inicial (camu-docs/03-financeiro/investimento-inicial.md).",
  },
  {
    name: "Embalagem padrão",
    type: "embalagem",
    unit: "unidade",
    stockUnit: "unidade",
    // Mesmo valor de packaging_cost usado em cost_parameters (ver
    // scripts/seed-pricing.ts) — caixa/saco + cartão por peça.
    referenceCost: 3,
    initialPurchase: 20,
    minimumQuantity: 50,
    purchaseNotes: "Compra inicial de exemplo (seed-inventory) — abaixo do limite mínimo de propósito.",
  },
];

async function main() {
  console.log("Iniciando seed de estoque de insumos...\n");

  const adminClient = createSeedAdminClient();
  const repositories = createRepositories(adminClient);
  const userService = new UserService(repositories);
  const inventoryService = new InventoryService(repositories);

  const existingUsers = await userService.listUsers();
  const owner = existingUsers.find((user) => user.userType === "owner") ?? null;

  const existingMaterials = await repositories.materials.findAll();

  for (const def of MATERIAL_DEFS) {
    let material = existingMaterials.find((m) => m.name === def.name) ?? null;

    if (material) {
      console.log(`  - insumo "${def.name}" já existia — mantido.`);
    } else {
      material = await repositories.materials.create({
        name: def.name,
        type: def.type,
        unit: def.unit,
        referenceCost: def.referenceCost,
        createdBy: owner?.id ?? null,
      });
      console.log(`  - insumo "${def.name}" criado.`);
    }

    const existingMovements = await repositories.materialStockMovements.findByMaterialId(material.id);
    if (existingMovements.length > 0) {
      console.log(`  - "${def.name}" já tem movimentação registrada — compra inicial não duplicada.`);
    } else {
      await inventoryService.registerMaterialMovement({
        materialId: material.id,
        quantity: def.initialPurchase,
        movementType: "compra",
        notes: def.purchaseNotes,
        createdBy: owner?.id ?? null,
      });
      console.log(`  - compra inicial de ${def.initialPurchase}${def.stockUnit} registrada para "${def.name}".`);
    }

    const existingThreshold = await repositories.materialStockThresholds.findByMaterialId(material.id);
    if (existingThreshold) {
      console.log(`  - limite mínimo de "${def.name}" já existia — mantido.`);
    } else {
      await inventoryService.setMaterialStockThreshold({
        materialId: material.id,
        minimumQuantity: def.minimumQuantity,
        updatedBy: owner?.id ?? null,
      });
      console.log(`  - limite mínimo de "${def.name}" definido em ${def.minimumQuantity}${def.stockUnit}.`);
    }
  }

  console.log("\nSeed concluído.");
}

// Sem process.exit() forçado: o cliente Supabase (undici) drena o pool e o
// Node encerra sozinho. Chamar process.exit() aqui dispara, de forma
// intermitente no Windows, o assertion do libuv
// (!(handle->flags & UV_HANDLE_CLOSING), src\win\async.c) por causa dos
// handles async do loader do tsx, o que abortava o `make dev`.
main().catch((error) => {
  console.error("\nErro ao rodar o seed:", error);
  process.exitCode = 1;
});
