import type { Repositories } from "@/lib/repositories";
import { CUSTOMER_ORDER_STATUSES, type CustomerOrderStatus, type OrderEvent } from "@/types/vendas";

// Ponte funil → status do cliente (design da proposta
// gestao-de-status-de-pedido-da-loja, decisão 5). Chave é o slug da etapa do
// funil; etapas fora daqui não sugerem nada. Fica fora de tela nesta versão —
// mudar o mapeamento é alterar código.
export const STAGE_TO_CUSTOMER_STATUS: Record<string, CustomerOrderStatus> = {
  imprimindo: "in_production",
  aguardando_envio: "finishing",
  enviado: "shipped",
};

export interface UpdateCustomerStatusInput {
  orderId: string;
  status: string;
  note: string | null;
}

type TrackingRepositories = Pick<Repositories, "orderTracking" | "salesOrders">;

export class OrderTrackingService {
  constructor(private readonly repositories: TrackingRepositories) {}

  listEvents(orderId: string): Promise<OrderEvent[]> {
    return this.repositories.orderTracking.listEvents(orderId);
  }

  // Movimentação livre (frente e trás), como o funil — só recusa repetir o
  // status atual, pra não gravar evento duplicado.
  async updateStatus(input: UpdateCustomerStatusInput): Promise<OrderEvent> {
    if (!CUSTOMER_ORDER_STATUSES.includes(input.status as CustomerOrderStatus)) {
      throw new Error("Status fora do vocabulário de acompanhamento do cliente.");
    }

    const order = await this.repositories.salesOrders.findById(input.orderId);
    if (!order) {
      throw new Error("Pedido não encontrado.");
    }
    if (order.status === input.status) {
      throw new Error("O pedido já está nesse status.");
    }

    await this.repositories.orderTracking.updateStatus(input.orderId, input.status);
    return this.repositories.orderTracking.insertEvent(input.orderId, input.status, input.note);
  }

  // Etapa do funil que acabou de receber o pedido → status de cliente
  // sugerido, ou null se a etapa não está mapeada ou o status já é o mesmo.
  suggestCustomerStatus(stageSlug: string, currentStatus: string): CustomerOrderStatus | null {
    const suggested = STAGE_TO_CUSTOMER_STATUS[stageSlug];
    if (!suggested || suggested === currentStatus) return null;
    return suggested;
  }
}
