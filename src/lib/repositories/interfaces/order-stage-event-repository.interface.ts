import type { OrderStageEvent } from "@/types/vendas";

export interface RecordStageEventInput {
  orderId: string;
  // Nulo na primeira colocação do pedido no funil.
  fromStageId: string | null;
  toStageId: string;
  printerId: string | null;
  note: string | null;
  createdBy: string | null;
}

// Append-only: sem update nem delete — nenhuma movimentação posterior edita
// as anteriores (ver migration vendas_funil_e_resultado, seção 7).
export interface IOrderStageEventRepository {
  listByOrder(orderId: string): Promise<OrderStageEvent[]>;
  record(input: RecordStageEventInput): Promise<OrderStageEvent>;
}
