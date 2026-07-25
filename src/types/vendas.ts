// Domínio de Vendas: pedido, funil de etapas cadastráveis, custo real e
// resultado. O "pedido" aqui é a mesma entidade que a loja do site alimenta
// (tabela `orders`) — ver migration vendas_funil_e_resultado, decisão 1 do
// design: não existe tabela de venda paralela.

export interface SaleOrigin {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  // "Boca-a-boca de quem?" — origens marcadas assim exigem soldByName no
  // pedido. Marketplace não tem vendedor nomeado.
  requiresSeller: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface OrderPipelineStage {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  color: string;
  isActive: boolean;
  isInitial: boolean;
  isFinal: boolean;
  // Etapa que pergunta "em qual impressora?" ao receber um pedido.
  requiresPrinter: boolean;
  createdBy: string | null;
  createdAt: string;
}

// Paleta das colunas do quadro. Fechada de propósito: cor livre em campo de
// texto vira classe Tailwind inexistente, que falha em silêncio.
export const STAGE_COLORS = [
  "slate",
  "violet",
  "blue",
  "cyan",
  "emerald",
  "amber",
  "rose",
] as const;

export type StageColor = (typeof STAGE_COLORS)[number];

export const ORDER_COST_CATEGORIES = [
  "filamento",
  "embalagem",
  "frete",
  "taxa_canal",
  "outros",
] as const;

export type OrderCostCategory = (typeof ORDER_COST_CATEGORIES)[number];

// De onde veio o lançamento de custo. O derivado da precificação é reescrito
// a cada gravação do pedido; o manual é do time e ninguém o toca.
export const ORDER_COST_SOURCES = ["manual", "precificacao"] as const;

export type OrderCostSource = (typeof ORDER_COST_SOURCES)[number];

export interface OrderCost {
  id: string;
  orderId: string;
  // Centavos, sempre > 0 (o banco recusa negativo: estorno se faz editando
  // ou excluindo o lançamento, não somando um valor negativo).
  amountCents: number;
  category: OrderCostCategory;
  description: string | null;
  source: OrderCostSource;
  createdBy: string | null;
  createdAt: string;
}

export interface SalesOrderItem {
  id: string;
  orderId: string;
  // Nulo em duas situações: item fora do catálogo (encomenda sob medida,
  // brinde) e peça excluída do catálogo depois da venda. Nas duas, o snapshot
  // de nome e preço abaixo é o que preserva o histórico.
  productId: string | null;
  productName: string;
  variant: string | null;
  unitPriceCents: number;
  // Custo unitário estimado pela precificação simples feita na venda. Nulo
  // quando o item não passou pela precificação.
  unitCostCents: number | null;
  qty: number;
}

export interface OrderStageEvent {
  id: string;
  orderId: string;
  // Nulo na primeira colocação do pedido no funil.
  fromStageId: string | null;
  toStageId: string;
  printerId: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  orderCode: string;
  // Eixo logístico/pagamento da loja do site. A tela de Vendas só o consulta
  // para saber se o pedido está cancelado — o funil é `stageId`.
  status: string;
  paymentStatus: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  addressCep: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressUf: string | null;
  // Nulo em pedidos vindos da loja do site; a tela os exibe como "Loja
  // própria" sem gravar (design, decisão 1).
  saleOriginId: string | null;
  // Texto livre, não referência a perfil: quem fecha a venda nem sempre tem
  // conta no ERP (amiga que revendeu na feira, parente que indicou).
  soldByName: string | null;
  stageId: string | null;
  currentPrinterId: string | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  items: SalesOrderItem[];
}

// Receita, custo e lucro de um pedido, vindos da view order_financials.
export interface OrderFinancials {
  orderId: string;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  // 0 = custo não informado, que a tela distingue de custo zero.
  costEntries: number;
}

export type SalesOrderWithFinancials = SalesOrder & { financials: OrderFinancials };

// Uma linha da view sales_monthly_results: grão (mês, origem).
export interface MonthlySalesResultRow {
  // ISO 'YYYY-MM-DD' no primeiro dia do mês.
  month: string;
  saleOriginId: string | null;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  orderCount: number;
}

// Um ponto da série do gráfico. Meses sem pedido entram zerados para não
// abrir buraco no eixo.
export interface MonthlySalesResult {
  // 'YYYY-MM'.
  month: string;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  orderCount: number;
}

export interface SalesResultByOrigin {
  saleOriginId: string | null;
  originName: string;
  originIsActive: boolean;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  orderCount: number;
}

export interface SalesResultTotals {
  revenueCents: number;
  costCents: number;
  profitCents: number;
  orderCount: number;
  // Nulo quando a receita do período é zero — margem indisponível, não 0%.
  marginPercent: number | null;
}

export interface SalesResult {
  fromMonth: string;
  toMonth: string;
  series: MonthlySalesResult[];
  byOrigin: SalesResultByOrigin[];
  totals: SalesResultTotals;
}
