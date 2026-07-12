import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRepositories } from "@/lib/repositories";
import { InventoryService } from "@/lib/services/inventory-service";
import { PrintQueueService } from "@/lib/services/print-queue-service";
import { SlackNotificationService } from "@/lib/services/slack-notification-service";

// Rotina agendada (cron) que conclui automaticamente qualquer item
// `imprimindo` cujo horário estimado de término já passou — ver Requirement
// "Conclusão automática por tempo esgotado". Protegida por segredo
// compartilhado, não por sessão de usuário: quem chama esta rota é um
// agendador externo (ver design.md decisão "Execução do job agendado é
// desacoplada do provedor de cron"), não um navegador autenticado.
//
// Aceita tanto GET quanto POST: Vercel Cron invoca por GET por padrão;
// outros agendadores (ex. GitHub Actions) podem preferir POST. Ambos exigem
// o mesmo segredo.
export function isAuthorizedCronRequest(authHeader: string | null, cronSecret: string | undefined): boolean {
  return Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!isAuthorizedCronRequest(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const repositories = createRepositories(supabase);
  const inventoryService = new InventoryService(repositories);
  const slackNotificationService = new SlackNotificationService();
  const printQueueService = new PrintQueueService(repositories, inventoryService, slackNotificationService);

  const completed = await printQueueService.completeExpiredPrintings();

  return NextResponse.json({
    completedCount: completed.length,
    completedIds: completed.map((item) => item.id),
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
