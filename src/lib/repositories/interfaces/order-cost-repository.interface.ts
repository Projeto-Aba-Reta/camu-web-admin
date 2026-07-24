import type { OrderCost, OrderCostCategory } from "@/types/vendas";

export interface CreateOrderCostInput {
  orderId: string;
  amountCents: number;
  category: OrderCostCategory;
  description: string | null;
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
