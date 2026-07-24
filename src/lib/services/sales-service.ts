import type { Repositories } from "@/lib/repositories";
import { slugify } from "@/lib/catalog/slug";
import {
  ORDER_COST_CATEGORIES,
  type OrderCost,
  type OrderCostCategory,
  type SaleOrigin,
  type SalesOrder,
  type SalesOrderWithFinancials,
} from "@/types/vendas";
import type {
  SalesOrderFilters,
  SalesOrderItemInput,
} from "@/lib/repositories/interfaces/sales-order-repository.interface";

export interface SalesOrderItemServiceInput {
  productId: string;
  // Quando ausente, o serviço usa o preço de tabela? Não: o preço praticado
  // é sempre explícito (a venda de feira raramente sai pelo preço do site).
  unitPriceCents: number;
  qty: number;
  variant: string | null;
}

export interface CreateSalesOrderServiceInput {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  addressCep: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressUf: string | null;
  saleOriginId: string;
  soldByProfileId: string | null;
  stageId: string | null;
  shippingCents: number;
  items: SalesOrderItemServiceInput[];
}

export type UpdateSalesOrderServiceInput = CreateSalesOrderServiceInput;

export interface CreateSaleOriginServiceInput {
  name: string;
  requiresSeller: boolean;
  createdBy: string | null;
}

export interface CreateOrderCostServiceInput {
  orderId: string;
  amountCents: number;
  category: OrderCostCategory;
  description: string | null;
  createdBy: string | null;
}

type SalesRepositories = Pick<
  Repositories,
  "salesOrders" | "saleOrigins" | "orderCosts" | "orderStageEvents" | "products"
>;

function assertCustomerName(name: string): void {
  if (!name.trim()) {
    throw new Error("Informe o nome do comprador.");
  }
}

function assertHasItems(items: SalesOrderItemServiceInput[]): void {
  if (items.length === 0) {
    throw new Error("O pedido precisa de pelo menos um item.");
  }
}

function assertItemValues(item: SalesOrderItemServiceInput): void {
  if (!Number.isInteger(item.qty) || item.qty <= 0) {
    throw new Error("A quantidade de cada item precisa ser um número inteiro maior que zero.");
  }
  if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
    throw new Error("O preço unitário não pode ser negativo.");
  }
}

function assertShipping(shippingCents: number): void {
  if (!Number.isInteger(shippingCents) || shippingCents < 0) {
    throw new Error("O frete não pode ser negativo.");
  }
}

// Subtotal = soma de preço × quantidade; total = subtotal + frete. Recalculado
// a cada gravação, nunca informado pela tela — o número exibido tem que ser
// sempre o que os itens dizem.
function computeTotals(
  items: SalesOrderItemServiceInput[],
  shippingCents: number,
): { subtotalCents: number; totalCents: number } {
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0);
  return { subtotalCents, totalCents: subtotalCents + shippingCents };
}

export class SalesService {
  constructor(private readonly repositories: SalesRepositories) {}

  // ---------------------------------------------------------------------
  // Pedidos
  // ---------------------------------------------------------------------

  list(filters?: SalesOrderFilters): Promise<SalesOrderWithFinancials[]> {
    return this.repositories.salesOrders.list(filters);
  }

  findById(id: string): Promise<SalesOrderWithFinancials | null> {
    return this.repositories.salesOrders.findById(id);
  }

  // A origem manda em duas coisas: existir/estar ativa e exigir ou não o
  // vendedor responsável. Quem valida é o serviço, não o banco — a exigência
  // depende de uma flag de outra tabela que o time alterna a qualquer hora.
  private async assertOrigin(
    saleOriginId: string,
    soldByProfileId: string | null,
  ): Promise<SaleOrigin> {
    const origin = await this.repositories.saleOrigins.findById(saleOriginId);
    if (!origin) {
      throw new Error("Origem de venda não encontrada.");
    }
    if (!origin.isActive) {
      throw new Error(`A origem "${origin.name}" está arquivada e não aceita novos pedidos.`);
    }
    if (origin.requiresSeller && !soldByProfileId) {
      throw new Error(`A origem "${origin.name}" exige informar quem vendeu.`);
    }
    return origin;
  }

  // Nome e preço do item são snapshot: renomear ou reprecificar a peça depois
  // não pode mexer em pedido já registrado.
  private async resolveItems(
    items: SalesOrderItemServiceInput[],
  ): Promise<SalesOrderItemInput[]> {
    const resolved: SalesOrderItemInput[] = [];
    for (const item of items) {
      assertItemValues(item);
      const product = await this.repositories.products.findById(item.productId);
      if (!product) {
        throw new Error("Uma das peças escolhidas não existe mais no catálogo.");
      }
      resolved.push({
        productId: product.id,
        productName: product.name,
        variant: item.variant,
        unitPriceCents: item.unitPriceCents,
        qty: item.qty,
      });
    }
    return resolved;
  }

  async createOrder(
    input: CreateSalesOrderServiceInput,
    createdBy: string | null,
  ): Promise<SalesOrder> {
    assertCustomerName(input.customerName);
    assertHasItems(input.items);
    assertShipping(input.shippingCents);
    await this.assertOrigin(input.saleOriginId, input.soldByProfileId);

    const items = await this.resolveItems(input.items);
    const { subtotalCents, totalCents } = computeTotals(input.items, input.shippingCents);

    const order = await this.repositories.salesOrders.create({
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      addressCep: input.addressCep,
      addressLine: input.addressLine,
      addressCity: input.addressCity,
      addressUf: input.addressUf,
      saleOriginId: input.saleOriginId,
      soldByProfileId: input.soldByProfileId,
      stageId: input.stageId,
      shippingCents: input.shippingCents,
      subtotalCents,
      totalCents,
      items,
    });

    // Primeira colocação no funil também é histórico: sem isto, um pedido
    // cadastrado direto em "Aguardando envio" não teria registro de como
    // chegou lá.
    if (order.stageId) {
      await this.repositories.orderStageEvents.record({
        orderId: order.id,
        fromStageId: null,
        toStageId: order.stageId,
        printerId: null,
        note: null,
        createdBy,
      });
    }

    return order;
  }

  async updateOrder(id: string, input: UpdateSalesOrderServiceInput): Promise<SalesOrder> {
    assertCustomerName(input.customerName);
    assertHasItems(input.items);
    assertShipping(input.shippingCents);
    await this.assertOrigin(input.saleOriginId, input.soldByProfileId);

    const items = await this.resolveItems(input.items);
    const { subtotalCents, totalCents } = computeTotals(input.items, input.shippingCents);

    return this.repositories.salesOrders.update(id, {
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      addressCep: input.addressCep,
      addressLine: input.addressLine,
      addressCity: input.addressCity,
      addressUf: input.addressUf,
      saleOriginId: input.saleOriginId,
      soldByProfileId: input.soldByProfileId,
      shippingCents: input.shippingCents,
      subtotalCents,
      totalCents,
      items,
    });
  }

  deleteOrder(id: string): Promise<void> {
    return this.repositories.salesOrders.delete(id);
  }

  // ---------------------------------------------------------------------
  // Origens de venda
  // ---------------------------------------------------------------------

  listOrigins(onlyActive = false): Promise<SaleOrigin[]> {
    return this.repositories.saleOrigins.listAll(onlyActive);
  }

  async createOrigin(input: CreateSaleOriginServiceInput): Promise<SaleOrigin> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Informe o nome da origem de venda.");
    }

    const slug = slugify(name);

    // Nasce no fim da lista; reordenar é uma ação separada.
    const origins = await this.repositories.saleOrigins.listAll();
    const canonical = canonicalizeName(name);
    const existing = origins.find(
      (origin) =>
        origin.slug === slug ||
        canonicalizeName(origin.slug) === canonical ||
        canonicalizeName(origin.name) === canonical,
    );
    if (existing) {
      throw new Error(`Já existe uma origem de venda chamada "${existing.name}".`);
    }

    const sortOrder = origins.reduce((max, origin) => Math.max(max, origin.sortOrder), 0) + 1;

    return this.repositories.saleOrigins.create({
      slug,
      name,
      sortOrder,
      requiresSeller: input.requiresSeller,
      createdBy: input.createdBy,
    });
  }

  async updateOrigin(
    id: string,
    input: { name?: string; requiresSeller?: boolean; sortOrder?: number },
  ): Promise<SaleOrigin> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("Informe o nome da origem de venda.");
    }
    return this.repositories.saleOrigins.update(id, {
      name: input.name?.trim(),
      requiresSeller: input.requiresSeller,
      sortOrder: input.sortOrder,
    });
  }

  // Arquivar, não excluir: a origem precisa sobreviver nos pedidos que já a
  // usam e nos recortes do resultado.
  setOriginActive(id: string, isActive: boolean): Promise<SaleOrigin> {
    return this.repositories.saleOrigins.update(id, { isActive });
  }

  async deleteOrigin(id: string): Promise<void> {
    const orderCount = await this.repositories.saleOrigins.countOrders(id);
    if (orderCount > 0) {
      throw new Error(
        `Esta origem já é usada por ${orderCount} pedido(s) e não pode ser excluída. Arquive-a para tirá-la do formulário sem perder o histórico.`,
      );
    }
    await this.repositories.saleOrigins.delete(id);
  }

  // ---------------------------------------------------------------------
  // Custo real
  // ---------------------------------------------------------------------

  listCosts(orderId: string): Promise<OrderCost[]> {
    return this.repositories.orderCosts.listByOrder(orderId);
  }

  // `async` de propósito, mesmo sem await antes da validação: sem isso a
  // recusa vira throw síncrono e quem chama com `.catch()` (as Server
  // Actions) não a captura.
  async createCost(input: CreateOrderCostServiceInput): Promise<OrderCost> {
    assertCostAmount(input.amountCents);
    assertCostCategory(input.category);
    return this.repositories.orderCosts.create(input);
  }

  async updateCost(
    id: string,
    input: { amountCents?: number; category?: OrderCostCategory; description?: string | null },
  ): Promise<OrderCost> {
    if (input.amountCents !== undefined) assertCostAmount(input.amountCents);
    if (input.category !== undefined) assertCostCategory(input.category);
    return this.repositories.orderCosts.update(id, input);
  }

  deleteCost(id: string): Promise<void> {
    return this.repositories.orderCosts.delete(id);
  }
}

// Os slugs semente usam underscore (`mercado_livre`) e slugify() gera hífen
// (`mercado-livre`), então comparar slug com slug deixaria passar uma segunda
// "Mercado Livre". A comparação canônica ignora a pontuação e pega o
// duplicado independentemente de como o slug foi escrito.
export function canonicalizeName(value: string): string {
  return slugify(value).replace(/-/g, "");
}

function assertCostAmount(amountCents: number): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(
      "O valor do custo precisa ser maior que zero. Para desfazer um lançamento, edite-o ou exclua-o.",
    );
  }
}

function assertCostCategory(category: OrderCostCategory): void {
  if (!ORDER_COST_CATEGORIES.includes(category)) {
    throw new Error(`Categoria de custo inválida: "${category}". Use "outros" quando não houver categoria específica.`);
  }
}
