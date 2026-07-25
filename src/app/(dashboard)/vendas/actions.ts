"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { SalesService } from "@/lib/services/sales-service";
import { SalesPipelineService } from "@/lib/services/sales-pipeline-service";
import {
  requireOrderCostWrite,
  requireSalesConfigure,
  requireSalesOrderMove,
  requireSalesOrderWrite,
} from "@/lib/auth/sales-access";
import type { OrderCostCategory } from "@/types/vendas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const PEDIDOS_PATH = "/vendas/pedidos";
const FUNIL_PATH = "/vendas/funil";
const RESULTADO_PATH = "/vendas/resultado";
const CONFIG_PATH = "/vendas/configuracoes";

async function getSalesService(): Promise<SalesService> {
  const supabase = await createClient();
  return new SalesService(createRepositories(supabase));
}

async function getPipelineService(): Promise<SalesPipelineService> {
  const supabase = await createClient();
  return new SalesPipelineService(createRepositories(supabase));
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Pedido, custo e etapa aparecem nas três primeiras abas ao mesmo tempo —
// revalidar só a de origem deixaria as outras exibindo número velho.
function revalidateSales(): void {
  revalidatePath(PEDIDOS_PATH);
  revalidatePath(FUNIL_PATH);
  revalidatePath(RESULTADO_PATH);
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export interface SalesOrderActionInput {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  addressCep: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressUf: string | null;
  saleOriginId: string;
  soldByName: string | null;
  stageId: string | null;
  shippingCents: number;
  items: {
    // Nulo = item fora do catálogo, identificado por productName.
    productId: string | null;
    productName: string | null;
    unitPriceCents: number;
    unitCostCents: number | null;
    qty: number;
    variant: string | null;
  }[];
}

export async function createSalesOrderAction(input: SalesOrderActionInput): Promise<ActionResult> {
  try {
    const user = await requireSalesOrderWrite();
    const service = await getSalesService();
    await service.createOrder(input, user.id);
    revalidateSales();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível cadastrar o pedido.") };
  }
}

export async function updateSalesOrderAction(
  orderId: string,
  input: SalesOrderActionInput,
): Promise<ActionResult> {
  try {
    await requireSalesOrderWrite();
    const service = await getSalesService();
    await service.updateOrder(orderId, input);
    revalidateSales();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível salvar o pedido.") };
  }
}

export async function deleteSalesOrderAction(orderId: string): Promise<ActionResult> {
  try {
    await requireSalesOrderWrite();
    const service = await getSalesService();
    await service.deleteOrder(orderId);
    revalidateSales();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível excluir o pedido.") };
  }
}

// ---------------------------------------------------------------------------
// Funil
// ---------------------------------------------------------------------------

export async function moveSalesOrderAction(input: {
  orderId: string;
  toStageId: string;
  printerId: string | null;
  note: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireSalesOrderMove();
    const service = await getPipelineService();
    await service.moveOrder({ ...input, movedBy: user.id });
    revalidateSales();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível mover o pedido.") };
  }
}

// ---------------------------------------------------------------------------
// Custo real
// ---------------------------------------------------------------------------

export async function createOrderCostAction(input: {
  orderId: string;
  amountCents: number;
  category: OrderCostCategory;
  description: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireOrderCostWrite();
    const service = await getSalesService();
    await service.createCost({ ...input, createdBy: user.id });
    revalidateSales();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível lançar o custo.") };
  }
}

export async function updateOrderCostAction(
  costId: string,
  input: { amountCents: number; category: OrderCostCategory; description: string | null },
): Promise<ActionResult> {
  try {
    await requireOrderCostWrite();
    const service = await getSalesService();
    await service.updateCost(costId, input);
    revalidateSales();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível salvar o custo.") };
  }
}

export async function deleteOrderCostAction(costId: string): Promise<ActionResult> {
  try {
    await requireOrderCostWrite();
    const service = await getSalesService();
    await service.deleteCost(costId);
    revalidateSales();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível excluir o custo.") };
  }
}

// ---------------------------------------------------------------------------
// Configuração: etapas do funil
// ---------------------------------------------------------------------------

export async function createStageAction(input: {
  name: string;
  color: string;
  requiresPrinter: boolean;
}): Promise<ActionResult> {
  try {
    const user = await requireSalesConfigure();
    const service = await getPipelineService();
    await service.createStage({ ...input, createdBy: user.id });
    revalidatePath(CONFIG_PATH);
    revalidatePath(FUNIL_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível criar a etapa.") };
  }
}

export async function updateStageAction(
  stageId: string,
  input: { name?: string; color?: string; requiresPrinter?: boolean },
): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getPipelineService();
    await service.updateStage(stageId, input);
    revalidatePath(CONFIG_PATH);
    revalidatePath(FUNIL_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível salvar a etapa.") };
  }
}

export async function reorderStagesAction(orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getPipelineService();
    await service.reorderStages(orderedIds);
    revalidatePath(CONFIG_PATH);
    revalidatePath(FUNIL_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível reordenar as etapas.") };
  }
}

export async function setInitialStageAction(stageId: string): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getPipelineService();
    await service.setInitialStage(stageId);
    revalidatePath(CONFIG_PATH);
    revalidatePath(FUNIL_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível marcar a etapa inicial.") };
  }
}

export async function setFinalStageAction(stageId: string): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getPipelineService();
    await service.setFinalStage(stageId);
    revalidatePath(CONFIG_PATH);
    revalidatePath(FUNIL_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível marcar a etapa final.") };
  }
}

export async function archiveStageAction(stageId: string): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getPipelineService();
    await service.archiveStage(stageId);
    revalidatePath(CONFIG_PATH);
    revalidatePath(FUNIL_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível arquivar a etapa.") };
  }
}

export async function restoreStageAction(stageId: string): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getPipelineService();
    await service.restoreStage(stageId);
    revalidatePath(CONFIG_PATH);
    revalidatePath(FUNIL_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível reativar a etapa.") };
  }
}

// ---------------------------------------------------------------------------
// Configuração: origens de venda
// ---------------------------------------------------------------------------

export async function createSaleOriginAction(input: {
  name: string;
  requiresSeller: boolean;
}): Promise<ActionResult> {
  try {
    const user = await requireSalesConfigure();
    const service = await getSalesService();
    await service.createOrigin({ ...input, createdBy: user.id });
    revalidatePath(CONFIG_PATH);
    revalidatePath(PEDIDOS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível criar a origem.") };
  }
}

export async function updateSaleOriginAction(
  originId: string,
  input: { name?: string; requiresSeller?: boolean },
): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getSalesService();
    await service.updateOrigin(originId, input);
    revalidatePath(CONFIG_PATH);
    revalidatePath(PEDIDOS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível salvar a origem.") };
  }
}

export async function setSaleOriginActiveAction(
  originId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requireSalesConfigure();
    const service = await getSalesService();
    await service.setOriginActive(originId, isActive);
    revalidatePath(CONFIG_PATH);
    revalidatePath(PEDIDOS_PATH);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, "Não foi possível alterar a situação da origem."),
    };
  }
}
