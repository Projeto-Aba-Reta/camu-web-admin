// Popula o domínio societário/governança a partir do estado hoje
// documentado em camu-docs (01-visao-geral/sociedade-e-divisao.md,
// 03-financeiro/tipo-pj-mei-vs-me.md, 05-decisoes/log-decisoes.md).
// Uso recomendado apenas em ambiente local (`npm run seed-governance`, com
// o Supabase local rodando via `npm run supabase:start` e depois de rodar
// `npm run seed-roles`, que cria o sócio titular do MEI).
//
// Idempotente: legal_entity_status/legal_migration_triggers/
// mei_ceiling_parameters são upsertados/checados por chave natural (tipo,
// ano) antes de inserir; decision_log_entries são checadas por título antes
// de inserir (a tabela é append-only, sem chave de upsert).

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { UserService } from "../src/lib/services/user-service";
import { GovernanceService } from "../src/lib/services/governance-service";
import type { Database } from "../src/lib/supabase/database.types";

function createSeedAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const CEILING_YEAR = 2026;
const CEILING_VALUE = 81000;

const MIGRATION_TRIGGER_TYPES = [
  "faturamento_proximo_teto",
  "lancamento_assinatura_recorrente",
  "necessidade_mais_funcionarios",
  "investimento_externo",
] as const;

// Transcrição das entradas hoje existentes em
// camu-docs/05-decisoes/log-decisoes.md, preservando data (mês/ano do
// original — o doc não registra o dia, então ordena por dia decrescente
// dentro do mês para preservar a ordem "mais recente no topo" já usada lá)
// e conteúdo.
const DECISION_LOG_ENTRIES = [
  {
    title: "Registros financeiros reais versionados dentro do camu-docs",
    decidedAt: "2026-07-10",
    context:
      "Era preciso organizar notas fiscais, recibos, comprovantes de PIX (aporte/retirada de sócio) e extratos bancários, tanto pra evitar problema fiscal quanto pra acompanhar o crescimento da empresa junto com a planilha de controle já prevista em controle-financeiro.md.",
    decision:
      "Criar a pasta 07-registros-financeiros/ dentro do próprio camu-docs, versionada normalmente no git (não em pasta local separada, não com os arquivos sensíveis no .gitignore).",
    alternativesConsidered:
      "Pasta local fora do git (nunca sincronizada via GitHub); pasta dentro do repo com a estrutura versionada mas os arquivos reais (PDFs/imagens) ignorados pelo git.",
    reasoning:
      "Repositório já é privado no GitHub; priorizamos ter um único lugar sincronizado entre os sócios (planejamento + documentos reais) em vez de fragmentar em armazenamento local que não replica automaticamente entre as máquinas dos 3 sócios. Risco de dado sensível fica mitigado por manter o repo sempre privado.",
  },
  {
    title: "Parque de impressoras se expande por papel, não por cópia da SE",
    decidedAt: "2026-07-09",
    context:
      "Com a demanda de marketplace crescendo, início de solicitações B2B e aproximação do planejamento da assinatura recorrente, a Ender-3 V3 SE sozinha deixa de sustentar o volume e a diversidade de produto (a linha Leon e miniaturas coloridas pedem multi-cor, que a SE não faz nativamente).",
    decision:
      "Ao invés de somar uma 2ª Ender-3 V3 SE, expandir o parque com a Bambu Lab A1 Combo (AMS Lite) primeiro — cobre multi-cor/multi-material para linha Leon, miniaturas e personalizados com cor customizada — e a Creality K1 Max em seguida, para volume, B2B e utilitários. A SE continua rodando (peças P e redundância).",
    alternativesConsidered:
      "Comprar uma 2ª Ender-3 V3 SE; comprar só a Creality K1 Max (mais rápida, mas não resolve multi-cor).",
    reasoning:
      "Multi-cor automatizado resolve um gargalo de tempo humano (pintura manual) maior do que o ganho de velocidade pura; o investimento da Bambu A1 Combo é menor (~R$4.750-5.750) que o do K1 Max (~R$6.000-7.000), então faz sentido priorizar a lacuna de capacidade que a SE realmente não cobre.",
  },
  {
    title: "Sequenciamento de canais de marketplace por categoria de produto",
    decidedAt: "2026-07-08",
    context:
      "7 marketplaces avaliados (Mercado Livre, Shopee, TikTok Shop, AliExpress, Temu, SHEIN, Amazon), cada um com mecanismo de descoberta e barreira de entrada diferentes; 4 dos 7 exigem CNPJ/MEI ativo.",
    decision:
      "Ativar Mercado Livre primeiro (aceita CPF, serve personalizados e utilitários, dados mais limpos pra Fase 1), Shopee em seguida (com cautela na precificação por faixa). Assim que o MEI sair, priorizar TikTok Shop (casa com a linha Leon e o mecanismo de vídeo/conteúdo). SHEIN fica para mais adiante, condicionado a dados de tração. AliExpress e Temu ficam como baixa prioridade — competem em preço com produção industrial chinesa, o oposto do posicionamento autoral da marca.",
    alternativesConsidered:
      "Abrir todos os canais disponíveis ao mesmo tempo assim que possível.",
    reasoning:
      "Cada canal tem um mecanismo de descoberta que serve melhor uma categoria específica do catálogo — abrir todos de uma vez dilui atenção sem ganho real, e a barreira de CNPJ já impõe uma ordem natural.",
  },
  {
    title: "Abrir MEI no nome de 1 sócio, com acordo particular entre os 3",
    decidedAt: "2026-07-07",
    context:
      "Sociedade com 3 sócios em SJC, recursos limitados (investimento inicial de ~R$2.000-2.500 rateado entre os 3). MEI não permite sócios formalmente no CNPJ (só 1 titular); ME (Sociedade Limitada) permite os 3, mas exige contador mensal e alíquota do Simples sobre faturamento.",
    decision:
      "Abrir MEI no nome de 1 sócio (quem toca produção/marketplace no dia a dia) durante as Fases 0-1, com os outros 2 sócios participando via acordo particular por escrito (não registrado em cartório). Formalizar como ME com os 3 no contrato social quando algum gatilho de migração ocorrer — tipicamente junto com o lançamento da assinatura recorrente (Fase 2-4) ou se o faturamento se aproximar do teto do MEI (R$81.000/ano em 2026).",
    alternativesConsidered: "Abrir ME desde o início com os 3 sócios formais.",
    reasoning:
      "Faturamento projetado da Fase 0-1 (~R$39-47 mil/ano) fica bem abaixo do teto do MEI; os 3 sócios são amigos de longa data e toparam manter informal nesta fase inicial sem risco de conflito relevante; custo do MEI (~R$82/mês) é muito menor que o de uma ME com contador.",
  },
  {
    title: "Marketplace primeiro, site/assinatura em paralelo mas sem abrir ao público",
    decidedAt: "2026-07-06",
    context: "Risco de sobrecarregar 1-2 pessoas com 3 frentes simultâneas (marketplace, site, pré-venda).",
    decision:
      "Sequenciar — marketplace valida primeiro; site/backend de assinatura são construídos em paralelo pelo sócio dev, mas a abertura pública da assinatura fica condicionada ao catálogo autoral estar maduro (15-20 peças/categoria).",
    alternativesConsidered: "Lançar as três frentes ao mesmo tempo (plano original).",
    reasoning:
      "Marketplace gera caixa e dados de venda reais antes de qualquer investimento maior; evita lançar assinatura sem sustentação de catálogo.",
  },
  {
    title: "Impressora inicial: Ender-3 V3 SE (não KE)",
    decidedAt: "2026-07-05",
    context:
      "Escolha entre SE (mais barata, mais lenta) e KE (mais cara, mais rápida), com produção revezada entre os dois sócios.",
    decision: "Começar com a SE.",
    alternativesConsidered: "KE.",
    reasoning:
      "Com revezamento de turnos entre os sócios, a máquina deixa de ser o gargalo — a diferença de R$ 600-700 pesa mais que o ganho de 30-40% de velocidade da KE. A economia vira reserva para uma 2ª impressora, se necessário.",
  },
];

async function seedLegalEntityStatus(
  governanceService: GovernanceService,
  titularProfileId: string,
  ownerId: string | null,
): Promise<void> {
  const current = await governanceService.getCurrentLegalEntityStatus();
  if (current) {
    console.log(`  - legal_entity_status já existia (${current.entityType}) — mantido.`);
    return;
  }

  await governanceService.recordLegalEntityStatus({
    entityType: "mei",
    titularProfileId,
    createdBy: ownerId,
  });
  console.log("  - legal_entity_status inicial (mei) criado.");
}

async function main() {
  console.log("Iniciando seed do domínio societário/governança...\n");

  const adminClient = createSeedAdminClient();
  const repositories = createRepositories(adminClient);
  const userService = new UserService(repositories);
  const governanceService = new GovernanceService(repositories);

  const users = await userService.listUsers();
  const owner = users.find((user) => user.userType === "owner") ?? null;
  const titular = users.find((user) => user.email === "socio-a@camu.local") ?? null;

  if (!titular) {
    throw new Error(
      'Nenhum usuário com e-mail "socio-a@camu.local" encontrado. Rode "npm run seed-roles" antes deste seed — o titular do MEI é o sócio A.',
    );
  }

  console.log("Enquadramento jurídico...");
  await seedLegalEntityStatus(governanceService, titular.id, owner?.id ?? null);

  console.log("\nGatilhos de migração...");
  const existingTriggers = await repositories.legalMigrationTriggers.listAll();
  const existingTriggerTypes = new Set(existingTriggers.map((trigger) => trigger.triggerType));
  for (const triggerType of MIGRATION_TRIGGER_TYPES) {
    if (existingTriggerTypes.has(triggerType)) {
      console.log(`  - gatilho "${triggerType}" já existia — mantido.`);
      continue;
    }
    await repositories.legalMigrationTriggers.updateStatus({
      triggerType,
      status: "pendente",
      updatedBy: owner?.id ?? null,
    });
    console.log(`  - gatilho "${triggerType}" criado (pendente).`);
  }

  console.log("\nTeto do MEI...");
  const existingCeiling = await repositories.revenueSnapshots.getCeilingForYear(CEILING_YEAR);
  if (existingCeiling) {
    console.log(`  - teto de ${CEILING_YEAR} já existia (R$${existingCeiling.annualCeiling}) — mantido.`);
  } else {
    await governanceService.upsertCeilingParameter({
      year: CEILING_YEAR,
      annualCeiling: CEILING_VALUE,
      createdBy: owner?.id ?? null,
    });
    console.log(`  - teto de ${CEILING_YEAR} criado (R$${CEILING_VALUE}).`);
  }

  console.log("\nLog de decisões...");
  const existingDecisions = await governanceService.listDecisionLog();
  const existingTitles = new Set(existingDecisions.map((entry) => entry.title));
  for (const entry of DECISION_LOG_ENTRIES) {
    if (existingTitles.has(entry.title)) {
      console.log(`  - decisão "${entry.title}" já existia — mantida.`);
      continue;
    }
    await governanceService.recordDecision({
      title: entry.title,
      context: entry.context,
      decision: entry.decision,
      alternativesConsidered: entry.alternativesConsidered,
      reasoning: entry.reasoning,
      decidedAt: entry.decidedAt,
      createdBy: owner?.id ?? null,
    });
    console.log(`  - decisão "${entry.title}" criada.`);
  }

  console.log("\nSeed de governança concluído.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nErro ao rodar o seed:", error);
    process.exit(1);
  });
