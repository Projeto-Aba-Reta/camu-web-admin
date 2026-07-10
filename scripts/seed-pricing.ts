// Popula os valores de referência do motor de cálculo de preço, hoje
// documentados em camu-docs/03-financeiro/{custo-por-peca,roadmap-impressoras}.md
// e camu-docs/06-marketplace/estrategia-canais.md.
// Uso recomendado apenas em ambiente local (`npm run seed-pricing`, com o
// Supabase local rodando via `npm run supabase:start`). Ver README.md.
//
// Idempotente: cada tabela é versionada por vigência (valid_from), então
// rodar de novo não sobrescreve nada — mas este script verifica se já existe
// um registro vigente/uma faixa/um canal antes de inserir, para não duplicar
// a mesma vigência a cada execução.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { UserService } from "../src/lib/services/user-service";
import type { Database } from "../src/lib/supabase/database.types";
import type { MarketplaceChannel, SizeTier } from "../src/types/pricing";

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

const SIZE_TIER_DEFS: Array<{
  tier: SizeTier;
  minWeightGrams: number;
  maxWeightGrams: number;
  minPrintHours: number;
  maxPrintHours: number;
}> = [
  // Faixas de referência de custo-por-peca.md (P ~15g/~2,1h, M ~35g/~4,2h,
  // G ~80g/~8,4h), com folga acima/abaixo do ponto de referência para
  // cobrir variação real de peça sem deixar buracos entre as faixas.
  { tier: "P", minWeightGrams: 5, maxWeightGrams: 20, minPrintHours: 0.5, maxPrintHours: 3 },
  { tier: "M", minWeightGrams: 20, maxWeightGrams: 55, minPrintHours: 3, maxPrintHours: 6 },
  { tier: "G", minWeightGrams: 55, maxWeightGrams: 150, minPrintHours: 6, maxPrintHours: 12 },
];

// Mercado Livre: percentual confirmado com o Owner/Sócio como a taxa bruta
// real (task 1.2) — os demais canais entram com placeholder explícito (0%)
// até validação real no seller center de cada plataforma (ver Open Questions
// do design.md).
const CHANNEL_FEE_DEFS: Array<{ channel: MarketplaceChannel; percentageFee: number; fixedFee: number }> = [
  { channel: "mercado_livre", percentageFee: 0.14, fixedFee: 0 },
  { channel: "shopee", percentageFee: 0, fixedFee: 0 },
  { channel: "tiktok_shop", percentageFee: 0, fixedFee: 0 },
  { channel: "amazon", percentageFee: 0, fixedFee: 0 },
  { channel: "shein", percentageFee: 0, fixedFee: 0 },
];

async function seedCostParameters(
  repositories: ReturnType<typeof createRepositories>,
  ownerId: string | null,
): Promise<void> {
  const existing = await repositories.costParameters.findCurrent();
  if (existing) {
    console.log("  - cost_parameters já tem um registro vigente — mantido.");
    return;
  }

  // Valores de referência de custo-por-peca.md: filamento ~R$90/kg, energia
  // ~R$0,80/kWh, consumo médio ~150W, reserva de falha 12,5% (ponto médio de
  // "10-15%" citado no doc). Embalagem confirmada com o Owner/Sócio (task 1.2).
  await repositories.costParameters.create({
    filamentCostPerKg: 90,
    energyCostPerKwh: 0.8,
    averagePowerWatts: 150,
    failureReservePct: 0.125,
    packagingCost: 3,
    createdBy: ownerId,
  });
  console.log("  - cost_parameters criado.");
}

async function seedPrinter(
  repositories: ReturnType<typeof createRepositories>,
  ownerId: string | null,
): Promise<void> {
  const active = await repositories.printers.findActive();
  if (active.some((printer) => printer.name === ENDER_3_V3_SE)) {
    console.log(`  - impressora "${ENDER_3_V3_SE}" já existia — mantida.`);
    return;
  }

  await repositories.printers.create({
    name: ENDER_3_V3_SE,
    model: ENDER_3_V3_SE,
    depreciationPerHour: 0.8,
    createdBy: ownerId,
  });
  console.log(`  - impressora "${ENDER_3_V3_SE}" criada.`);
}

async function seedSizeTierRanges(repositories: ReturnType<typeof createRepositories>): Promise<void> {
  const current = await repositories.sizeTierRanges.findAllCurrent();
  const existingTiers = new Set(current.map((range) => range.tier));

  for (const def of SIZE_TIER_DEFS) {
    if (existingTiers.has(def.tier)) {
      console.log(`  - faixa de porte "${def.tier}" já existia — mantida.`);
      continue;
    }
    await repositories.sizeTierRanges.create(def);
    console.log(`  - faixa de porte "${def.tier}" criada.`);
  }
}

async function seedChannelFees(
  repositories: ReturnType<typeof createRepositories>,
  ownerId: string | null,
): Promise<void> {
  for (const def of CHANNEL_FEE_DEFS) {
    const existing = await repositories.channelFees.findCurrentForChannel(def.channel);
    if (existing) {
      console.log(`  - taxa do canal "${def.channel}" já existia — mantida.`);
      continue;
    }
    await repositories.channelFees.create({ ...def, createdBy: ownerId });
    console.log(`  - taxa do canal "${def.channel}" criada.`);
  }
}

async function main() {
  console.log("Iniciando seed de parâmetros de precificação...\n");

  const adminClient = createSeedAdminClient();
  const repositories = createRepositories(adminClient);
  const userService = new UserService(repositories);

  const existingUsers = await userService.listUsers();
  const owner = existingUsers.find((user) => user.userType === "owner") ?? null;

  console.log("Parâmetros de custo...");
  await seedCostParameters(repositories, owner?.id ?? null);

  console.log("\nParque de impressoras...");
  await seedPrinter(repositories, owner?.id ?? null);

  console.log("\nFaixas de porte P/M/G...");
  await seedSizeTierRanges(repositories);

  console.log("\nTaxas por canal...");
  await seedChannelFees(repositories, owner?.id ?? null);

  console.log("\nSeed concluído.");
  console.log(
    "AVISO: taxas de canal além do Mercado Livre estão com placeholder 0% — confirmar valor " +
      "real no seller center de cada plataforma antes de usar em produção (ver design.md, Open Questions).",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nErro ao rodar o seed:", error);
    process.exit(1);
  });
