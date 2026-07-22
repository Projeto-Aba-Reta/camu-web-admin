// Popula os valores de referência do motor de cálculo de preço, hoje
// documentados em camu-docs/03-financeiro/{custo-por-peca,roadmap-impressoras}.md
// e camu-docs/06-marketplace/estrategia-canais.md, complementados com
// pesquisa na internet (jul/2026, ver comentários por seção) para os itens
// que lá ainda estavam como placeholder.
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
import type { CreateSizeTierRangeInput } from "../src/lib/repositories/interfaces/size-tier-range-repository.interface";
import type { MarketplaceChannel } from "../src/types/pricing";

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

const SIZE_TIER_DEFS: CreateSizeTierRangeInput[] = [
  // Faixas de referência de custo-por-peca.md (P ~15g/~2,1h, M ~35g/~4,2h,
  // G ~80g/~8,4h), com folga acima/abaixo do ponto de referência para
  // cobrir variação real de peça sem deixar buracos entre as faixas.
  //
  // Margem por porte: uma peça G imobiliza impressora e filamento por horas,
  // uma P sai em minutos — cada faixa carrega sua própria margem, aqui toda
  // somada à margem-alvo global (modo "somar").
  {
    tier: "P",
    minWeightGrams: 5,
    maxWeightGrams: 20,
    minPrintHours: 0.5,
    maxPrintHours: 3,
    b2cMarginPct: 0.08,
    b2cMarginMode: "somar",
    b2bMarginPct: 0.04,
    b2bMarginMode: "somar",
  },
  {
    tier: "M",
    minWeightGrams: 20,
    maxWeightGrams: 55,
    minPrintHours: 3,
    maxPrintHours: 6,
    b2cMarginPct: 0.12,
    b2cMarginMode: "somar",
    b2bMarginPct: 0.06,
    b2bMarginMode: "somar",
  },
  {
    tier: "G",
    minWeightGrams: 55,
    maxWeightGrams: 150,
    minPrintHours: 6,
    maxPrintHours: 12,
    b2cMarginPct: 0.2,
    b2cMarginMode: "somar",
    b2bMarginPct: 0.1,
    b2bMarginMode: "somar",
  },
];

// Mercado Livre: percentual confirmado com o Owner/Sócio como a taxa bruta
// real (task 1.2). Os demais canais foram pesquisados na internet em
// jul/2026 (fontes no README/PR, não em camu-docs) — cada plataforma cobra
// por faixa de preço; como as peças do catálogo hoje ficam majoritariamente
// abaixo de R$80-100 (miniaturas/personalizados pequenos), a faixa "ticket
// baixo" de cada canal foi escolhida como representativa. Ainda assim,
// SHALL ser validado no seller center de cada plataforma antes de uso real
// (mesmo aviso do design.md, Open Questions):
//   - Shopee: abaixo de R$80 paga 20% + R$4 fixo (a partir de R$80 cai para
//     14%, mas com taxa fixa maior).
//   - TikTok Shop: a partir de 15/jul/2026, itens abaixo de R$50 pagam 10%
//     + R$4 fixo (o valor já engloba a comissão de plataforma + subsídio de
//     frete, cobrados juntos por pedido).
//   - Amazon: referral fee de 10-15% por categoria; usado 15% (faixa alta,
//     mais próxima de brinquedos/colecionáveis) e sem taxa fixa por item.
//   - Shein: comissão fixa de 16% sobre o valor da venda, sem taxa de
//     anúncio nem taxa fixa por item.
const CHANNEL_FEE_DEFS: Array<{ channel: MarketplaceChannel; percentageFee: number; fixedFee: number }> = [
  { channel: "mercado_livre", percentageFee: 0.14, fixedFee: 0 },
  { channel: "shopee", percentageFee: 0.2, fixedFee: 4 },
  { channel: "tiktok_shop", percentageFee: 0.1, fixedFee: 4 },
  { channel: "amazon", percentageFee: 0.15, fixedFee: 0 },
  { channel: "shein", percentageFee: 0.16, fixedFee: 0 },
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

  // Filamento R$130/kg e energia R$0,80/kWh: confirmados na sessão de
  // alinhamento de precificação de 12/07/2026 (Caixa Mandala / Leon Judoca),
  // substituindo os valores anteriores de pesquisa de mercado (R$90/kg e
  // R$0,75/kWh) — ver openspec/changes/precificacao-produtos-compostos-e-
  // ficha-de-fatiamento/proposal.md. Consumo médio ~150W: dentro da faixa
  // pesquisada para a Ender-3 V3 SE em operação (~120-160W; consumo máximo
  // de pico da fonte é 350W, mas a impressão típica não usa a capacidade
  // máxima). Reserva de falha 12,5% (ponto médio de "10-15%" citado em
  // custo-por-peca.md, mesma faixa reafirmada na sessão de 12/07/2026).
  // Embalagem R$3 confirmada com o Owner/Sócio (task 1.2) — ainda pendente
  // de reconfirmação formal (ver Open Questions do design.md desta mudança).
  // Margem-alvo B2C inicial em 0%: preserva o preço de equilíbrio já em uso
  // até o Financeiro definir um valor-alvo (ver design.md, Open Questions).
  await repositories.costParameters.create({
    filamentCostPerKg: 130,
    energyCostPerKwh: 0.8,
    averagePowerWatts: 150,
    failureReservePct: 0.125,
    packagingCost: 3,
    targetMarginPct: 0,
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

  // Depreciação R$0,80/h: preço de mercado pesquisado para a Ender-3 V3 SE
  // no Brasil em jul/2026 (~R$1.500-1.700 em marketplaces) dividido por uma
  // vida útil assumida de ~2.000h de impressão (~2 anos de uso moderado de
  // ateliê antes de expansão/substituição, mesmo horizonte usado no
  // roadmap-impressoras.md) — resultado (~R$0,75-0,85/h) bate com o valor
  // já documentado em camu-docs, então foi mantido.
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

// Portes de sistema (P/M/G): precisam existir em size_tiers antes das faixas,
// que os referenciam por FK. Insert direto (idempotente) — o registro de
// portes não passa pelos repositórios de faixa.
async function seedSizeTiers(adminClient: SupabaseClient<Database>): Promise<void> {
  const { error } = await adminClient.from("size_tiers").upsert(
    [
      { code: "P", label: "Pequena", sort_order: 10, is_system: true },
      { code: "M", label: "Média", sort_order: 20, is_system: true },
      { code: "G", label: "Grande", sort_order: 30, is_system: true },
    ],
    { onConflict: "code", ignoreDuplicates: true },
  );
  if (error) throw error;
  console.log("  - portes de sistema P/M/G garantidos.");
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

  console.log("\nPortes de tamanho...");
  await seedSizeTiers(adminClient);

  console.log("\nFaixas de porte...");
  await seedSizeTierRanges(repositories);

  console.log("\nTaxas por canal...");
  await seedChannelFees(repositories, owner?.id ?? null);

  console.log("\nSeed concluído.");
  console.log(
    "AVISO: taxas de canal além do Mercado Livre e o custo de energia vêm de pesquisa na internet " +
      "(jul/2026), não de confirmação real do Owner/Sócio — revisar no seller center de cada " +
      "plataforma e na conta de luz real antes de usar em produção (ver design.md, Open Questions).",
  );
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
