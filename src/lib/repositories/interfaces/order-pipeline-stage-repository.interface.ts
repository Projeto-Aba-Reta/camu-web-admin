import type { OrderPipelineStage } from "@/types/vendas";

export interface CreateOrderPipelineStageInput {
  slug: string;
  name: string;
  sortOrder: number;
  color: string;
  requiresPrinter: boolean;
  createdBy: string | null;
}

export interface UpdateOrderPipelineStageInput {
  name?: string;
  sortOrder?: number;
  color?: string;
  isActive?: boolean;
  isInitial?: boolean;
  isFinal?: boolean;
  requiresPrinter?: boolean;
}

export interface IOrderPipelineStageRepository {
  listAll(onlyActive?: boolean): Promise<OrderPipelineStage[]>;
  findById(id: string): Promise<OrderPipelineStage | null>;
  findBySlug(slug: string): Promise<OrderPipelineStage | null>;
  findInitial(): Promise<OrderPipelineStage | null>;
  create(input: CreateOrderPipelineStageInput): Promise<OrderPipelineStage>;
  update(id: string, input: UpdateOrderPipelineStageInput): Promise<OrderPipelineStage>;
  delete(id: string): Promise<void>;
  // Reordenação em lote. Os índices únicos parciais de is_initial/is_final
  // não alcançam sort_order, então a normalização é responsabilidade de
  // quem chama (SalesPipelineService) — aqui só se aplica o resultado.
  reorder(positions: { id: string; sortOrder: number }[]): Promise<void>;
  // Usado antes de arquivar: uma etapa com pedidos não pode sumir do quadro.
  countOrders(id: string): Promise<number>;
}
