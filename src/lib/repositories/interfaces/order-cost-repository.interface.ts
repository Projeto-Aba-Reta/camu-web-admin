import type { OrderCost, OrderCostCategory, OrderCostSource } from "@/types/vendas";

export interface CreateOrderCostInput {
  orderId: string;
  amountCents: number;
  category: OrderCostCategory;
  description: string | null;
  // Ausente = "manual", o caso do lançamento feito na tela de custo real.
  source?: OrderCostSource;
  createdBy: string | null;
}

export interface UpdateOrderCostInput {
  amountCents?: number;
  category?: OrderCostCategory;
  description?: string | null;
}

export interface IOrderCostRepository {
  listByOrder(orderId: string): Promise<OrderCost[]>;
  findById(id: string): Promise<OrderCost | null>;
  create(input: CreateOrderCostInput): Promise<OrderCost>;
  update(id: string, input: UpdateOrderCostInput): Promise<OrderCost>;
  delete(id: string): Promise<void>;
}
