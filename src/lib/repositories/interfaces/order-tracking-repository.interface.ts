import type { OrderEvent } from "@/types/vendas";

// Append-only, igual ao histórico do funil: sem update nem delete (ver
// design da proposta gestao-de-status-de-pedido-da-loja).
export interface IOrderTrackingRepository {
  listEvents(orderId: string): Promise<OrderEvent[]>;
  updateStatus(orderId: string, status: string): Promise<void>;
  insertEvent(orderId: string, status: string, note: string | null): Promise<OrderEvent>;
}
