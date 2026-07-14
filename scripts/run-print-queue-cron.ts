// Roda localmente, em loop, a mesma rotina que /api/cron/complete-print-queue
// executa quando chamada por um agendador — conclui automaticamente itens
// `imprimindo` cujo tempo estimado já esgotou (ver Requirement "Conclusão
// automática por tempo esgotado"). Sem este script, no local o cronômetro da
// fila nunca sai de "tempo estimado esgotado" sozinho — só via conclusão
// manual.
//
// Uso: `npm run dev:cron`, rodando em paralelo a `npm run dev` (Supabase
// local ativo). Ctrl+C para parar. Este script chama o service diretamente,
// sem passar pela rota nem exigir segredo — é conveniência de desenvolvimento.
// No ambiente hospedado o agendador é opcional e hoje não existe (o cron da
// Vercel exige plano Pro); ver docs/deploy-dev.md, Parte 3.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { InventoryService } from "../src/lib/services/inventory-service";
import { PrintQueueService } from "../src/lib/services/print-queue-service";
import { SlackNotificationService } from "../src/lib/services/slack-notification-service";
import type { Database } from "../src/lib/supabase/database.types";

// Client isolado com a service_role key — mesma justificativa de
// scripts/seed-roles.ts (o módulo admin.ts importa "server-only", que lança
// erro fora do bundler do Next).
function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const INTERVAL_MS = Number(process.env.PRINT_QUEUE_CRON_INTERVAL_MS ?? 15_000);

async function tick(): Promise<void> {
  const adminClient = createAdminClient();
  const repositories = createRepositories(adminClient);
  const inventoryService = new InventoryService(repositories);
  const slackNotificationService = new SlackNotificationService();
  const printQueueService = new PrintQueueService(repositories, inventoryService, slackNotificationService);

  const completed = await printQueueService.completeExpiredPrintings();
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  if (completed.length > 0) {
    console.log(`[${timestamp}] concluídos automaticamente: ${completed.map((item) => item.id).join(", ")}`);
  } else {
    console.log(`[${timestamp}] nenhum item vencido no momento.`);
  }
}

async function main() {
  console.log(
    `Simulando localmente o job agendado da fila de impressão (a cada ${INTERVAL_MS / 1000}s). Ctrl+C para parar.\n`,
  );

  await tick();
  setInterval(() => {
    tick().catch((error) => console.error("Erro ao rodar a rotina:", error));
  }, INTERVAL_MS);
}

main().catch((error) => {
  console.error("Erro ao iniciar a rotina:", error);
  process.exit(1);
});
