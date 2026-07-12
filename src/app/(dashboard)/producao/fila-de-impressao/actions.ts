"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { InventoryService } from "@/lib/services/inventory-service";
import { PrintQueueService } from "@/lib/services/print-queue-service";
import { SlackNotificationService } from "@/lib/services/slack-notification-service";
import { requirePrintQueueWrite } from "@/lib/auth/print-queue-access";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const FILA_PATH = "/producao/fila-de-impressao";
const INSUMOS_PATH = "/producao/estoque/insumos";
const PECAS_PATH = "/producao/estoque/pecas";

async function getPrintQueueService(): Promise<PrintQueueService> {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const inventoryService = new InventoryService(repositories);
  const slackNotificationService = new SlackNotificationService();
  return new PrintQueueService(repositories, inventoryService, slackNotificationService);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export interface AddToQueueActionInput {
  productId: string;
  quantity: number;
}

export async function addToQueueAction(input: AddToQueueActionInput): Promise<ActionResult> {
  try {
    const user = await requirePrintQueueWrite();
    const printQueueService = await getPrintQueueService();
    await printQueueService.addToQueue({ ...input, createdBy: user.id });
    revalidatePath(FILA_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível adicionar o item à fila.") };
  }
}

export async function startPrintingAction(itemId: string, printerId: string): Promise<ActionResult> {
  try {
    await requirePrintQueueWrite();
    const printQueueService = await getPrintQueueService();
    await printQueueService.startPrinting(itemId, printerId);
    revalidatePath(FILA_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível iniciar a impressão.") };
  }
}

export async function completePrintingAction(itemId: string): Promise<ActionResult> {
  try {
    const user = await requirePrintQueueWrite();
    const printQueueService = await getPrintQueueService();
    await printQueueService.completePrinting(itemId, user.id);
    revalidatePath(FILA_PATH);
    // Conclusão gera movimentações de estoque de insumo e de peça pronta —
    // revalida as telas de estoque para refletir o novo saldo.
    revalidatePath(INSUMOS_PATH);
    revalidatePath(PECAS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível concluir a impressão.") };
  }
}

export async function cancelPrintQueueItemAction(itemId: string): Promise<ActionResult> {
  try {
    await requirePrintQueueWrite();
    const printQueueService = await getPrintQueueService();
    await printQueueService.cancel(itemId);
    revalidatePath(FILA_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível cancelar o item.") };
  }
}
