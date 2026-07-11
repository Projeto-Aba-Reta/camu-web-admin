// Popula o estoque inicial de insumos a partir do valor de referência hoje
// documentado em camu-docs/03-financeiro/investimento-inicial.md (3kg de
// filamento PLA genérico, ~R$90/kg).
// Uso recomendado apenas em ambiente local (`npm run seed-inventory`, com o
// Supabase local rodando via `npm run supabase:start`).
//
// Idempotente: o material é upsertado por nome antes de inserir, e a
// movimentação de compra inicial só é criada se o material ainda não tiver
// nenhuma movimentação registrada (a tabela é append-only, sem chave de
// upsert própria).

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { UserService } from "../src/lib/services/user-service";
import { InventoryService } from "../src/lib/services/inventory-service";
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

const MATERIAL_NAME = "Filamento PLA genérico";
const INITIAL_PURCHASE_KG = 3;
const REFERENCE_COST_PER_KG = 90;

async function main() {
  console.log("Iniciando seed de estoque de insumos...\n");

  const adminClient = createSeedAdminClient();
  const repositories = createRepositories(adminClient);
  const userService = new UserService(repositories);
  const inventoryService = new InventoryService(repositories);

  const existingUsers = await userService.listUsers();
  const owner = existingUsers.find((user) => user.userType === "owner") ?? null;

  const existingMaterials = await repositories.materials.findAll();
  let material = existingMaterials.find((m) => m.name === MATERIAL_NAME) ?? null;

  if (material) {
    console.log(`  - insumo "${MATERIAL_NAME}" já existia — mantido.`);
  } else {
    material = await repositories.materials.create({
      name: MATERIAL_NAME,
      type: "filamento",
      unit: "kg",
      referenceCost: REFERENCE_COST_PER_KG,
      createdBy: owner?.id ?? null,
    });
    console.log(`  - insumo "${MATERIAL_NAME}" criado.`);
  }

  const existingMovements = await repositories.materialStockMovements.findByMaterialId(material.id);
  if (existingMovements.length > 0) {
    console.log(`  - "${MATERIAL_NAME}" já tem movimentação registrada — compra inicial não duplicada.`);
  } else {
    await inventoryService.registerMaterialMovement({
      materialId: material.id,
      quantity: INITIAL_PURCHASE_KG,
      movementType: "compra",
      notes: "Investimento inicial (camu-docs/03-financeiro/investimento-inicial.md).",
      createdBy: owner?.id ?? null,
    });
    console.log(`  - compra inicial de ${INITIAL_PURCHASE_KG}kg registrada para "${MATERIAL_NAME}".`);
  }

  console.log("\nSeed concluído.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nErro ao rodar o seed:", error);
    process.exit(1);
  });
