import type { SalesOrder, SalesOrderWithFinancials } from "@/types/vendas";

export interface SalesOrderItemInput {
  // Nulo em item fora do catálogo — o nome digitado é o que identifica a peça.
  productId: string | null;
  productName: string;
  variant: string | null;
  unitPriceCents: number;
  unitCostCents: number | null;
  qty: number;
}

export interface CreateSalesOrderInput {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  addressCep: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressUf: string | null;
  saleOriginId: string;
  soldByName: string | null;
  // Nulo deixa o trigger do banco posicionar na etapa inicial.
  stageId: string | null;
  shippingCents: number;
  // Derivados dos itens mais o frete pelo SalesService, que é onde a regra
  // é testável — o repositório só persiste o número que recebe.
  subtotalCents: number;
  totalCents: number;
  items: SalesOrderItemInput[];
}

export interface UpdateSalesOrderInput {
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  addressCep?: string | null;
  addressLine?: string | null;
  addressCity?: string | null;
  addressUf?: string | null;
  saleOriginId?: string;
  soldByName?: string | null;
  shippingCents?: number;
  subtotalCents?: number;
  totalCents?: number;
  // Quando informado, substitui a lista inteira de itens.
  items?: SalesOrderItemInput[];
}

export interface MoveSalesOrderInput {
  stageId: string;
  // Null limpa a impressora — é o que acontece ao sair de uma etapa que
  // exige impressora.
  currentPrinterId: string | null;
}

export interface SalesOrderFilters {
  // ISO 'YYYY-MM-DD', inclusivos.
  createdFrom?: string;
  createdTo?: string;
  saleOriginId?: string;
  // Casa por trecho do nome, sem diferenciar maiúsculas: o vendedor é texto
  // livre e "Ana" tem que achar "Ana Paula".
  soldByName?: string;
  stageId?: string;
}

export interface ISalesOrderRepository {
  // Listagem da aba Pedidos: já traz receita/custo/lucro da view
  // order_financials, para a tela não fazer N+1.
  list(filters?: SalesOrderFilters): Promise<SalesOrderWithFinancials[]>;
  // Quadro do funil. `includeArchivedFinal = false` esconde os pedidos que
  // estão na etapa final há mais de 30 dias (design, decisão 10).
  listForBoard(includeArchivedFinal: boolean): Promise<SalesOrderWithFinancials[]>;
  findById(id: string): Promise<SalesOrderWithFinancials | null>;
  // Nomes de vendedor já usados, sem repetição. Alimenta a sugestão do campo
  // de texto — quem digita "Ana" na segunda venda tem que reaproveitar a
  // grafia da primeira, senão o filtro e o histórico se partem em dois.
  listSellerNames(): Promise<string[]>;
  create(input: CreateSalesOrderInput): Promise<SalesOrder>;
  update(id: string, input: UpdateSalesOrderInput): Promise<SalesOrder>;
  move(id: string, input: MoveSalesOrderInput): Promise<SalesOrder>;
  delete(id: string): Promise<void>;
}
