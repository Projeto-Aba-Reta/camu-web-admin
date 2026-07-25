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
  // Nulo = item fora do catálogo (encomenda sob medida, brinde, peça de
  // teste). Aí quem identifica a peça é `productName`.
  productId: string | null;
  // Só é lido quando productId é nulo — item de catálogo tira o nome da peça.
  productName: string | null;
  // Quando ausente, o serviço usa o preço de tabela? Não: o preço praticado
  // é sempre explícito (a venda de feira raramente sai pelo preço do site).
  unitPriceCents: number;
  // Custo unitário estimado pela precificação simples, quando o usuário a
  // usou. Vira lançamento de custo do pedido — ver syncPricingCost.
  unitCostCents: number | null;
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
  // Texto livre: quem vendeu pode não ter conta no ERP.
  soldByName: string | null;
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
  if (
    item.unitCostCents !== null &&
    (!Number.isInteger(item.unitCostCents) || item.unitCostCents < 0)
  ) {
    throw new Error("O custo unitário estimado não pode ser negativo.");
  }
}

// Vendedor em branco é "ninguém em específico", não um nome vazio — sem esta
// normalização, espaço em branco passaria pela exigência de requires_seller e
// viraria uma linha que o banco recusa.
function normalizeSellerName(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
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

  // Sugestões do campo "quem vendeu": nomes já usados em outros pedidos.
  listSellerNames(): Promise<string[]> {
    return this.repositories.salesOrders.listSellerNames();
  }

  // A origem manda em duas coisas: existir/estar ativa e exigir ou não o
  // vendedor responsável. Quem valida é o serviço, não o banco — a exigência
  // depende de uma flag de outra tabela que o time alterna a qualquer hora.
  private async assertOrigin(
    saleOriginId: string,
    soldByName: string | null,
  ): Promise<SaleOrigin> {
    const origin = await this.repositories.saleOrigins.findById(saleOriginId);
    if (!origin) {
      throw new Error("Origem de venda não encontrada.");
    }
    if (!origin.isActive) {
      throw new Error(`A origem "${origin.name}" está arquivada e não aceita novos pedidos.`);
    }
    if (origin.requiresSeller && !soldByName) {
      throw new Error(`A origem "${origin.name}" exige informar quem vendeu.`);
    }
    return origin;
  }

  // Nome e preço do item são snapshot: renomear ou reprecificar a peça depois
  // não pode mexer em pedido já registrado. Item sem peça do catálogo carrega
  // o nome digitado — é o que permite vender encomenda sob medida sem ter que
  // cadastrar uma peça só para fechar o pedido.
  private async resolveItems(
    items: SalesOrderItemServiceInput[],
  ): Promise<SalesOrderItemInput[]> {
    const resolved: SalesOrderItemInput[] = [];
    for (const item of items) {
      assertItemValues(item);

      if (!item.productId) {
        const name = item.productName?.trim() ?? "";
        if (!name) {
          throw new Error("Item fora do catálogo precisa de um nome.");
        }
        resolved.push({
          productId: null,
          productName: name,
          variant: item.variant,
          unitPriceCents: item.unitPriceCents,
          unitCostCents: item.unitCostCents,
          qty: item.qty,
        });
        continue;
      }

      const product = await this.repositories.products.findById(item.productId);
      if (!product) {
        throw new Error("Uma das peças escolhidas não existe mais no catálogo.");
      }
      resolved.push({
        productId: product.id,
        productName: product.name,
        variant: item.variant,
        unitPriceCents: item.unitPriceCents,
        unitCostCents: item.unitCostCents,
        qty: item.qty,
      });
    }
    return resolved;
  }

  // O custo estimado dos itens só fecha as telas de custo real e de resultado
  // se virar lançamento em order_costs — é de lá que as views tiram o custo do
  // pedido. Um único lançamento por pedido, reescrito a cada gravação: somar
  // um novo a cada salvamento dobraria o custo, e mexer nos lançamentos
  // manuais apagaria o que o time anotou à mão.
  private async syncPricingCost(
    orderId: string,
    items: SalesOrderItemInput[],
    createdBy: string | null,
  ): Promise<void> {
    const amountCents = items.reduce((sum, item) => sum + (item.unitCostCents ?? 0) * item.qty, 0);

    const costs = await this.repositories.orderCosts.listByOrder(orderId);
    const existing = costs.find((cost) => cost.source === "precificacao");

    if (amountCents <= 0) {
      // Itens precificados foram removidos ou zerados: o lançamento derivado
      // some junto, senão sobraria custo sem origem.
      if (existing) await this.repositories.orderCosts.delete(existing.id);
      return;
    }

    const description = "Custo estimado na precificação dos itens";
    if (existing) {
      await this.repositories.orderCosts.update(existing.id, { amountCents, description });
      return;
    }

    await this.repositories.orderCosts.create({
      orderId,
      amountCents,
      // "outros" porque o valor é a soma de filamento, energia, depreciação,
      // reserva de falha e embalagem — nenhuma categoria isolada o descreve.
      category: "outros",
      description,
      source: "precificacao",
      createdBy,
    });
  }

  async createOrder(
    input: CreateSalesOrderServiceInput,
    createdBy: string | null,
  ): Promise<SalesOrder> {
    assertCustomerName(input.customerName);
    assertHasItems(input.items);
    assertShipping(input.shippingCents);
    const soldByName = normalizeSellerName(input.soldByName);
    await this.assertOrigin(input.saleOriginId, soldByName);

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
      soldByName,
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

    await this.syncPricingCost(order.id, items, createdBy);

    return order;
  }

  async updateOrder(id: string, input: UpdateSalesOrderServiceInput): Promise<SalesOrder> {
    assertCustomerName(input.customerName);
    assertHasItems(input.items);
    assertShipping(input.shippingCents);
    const soldByName = normalizeSellerName(input.soldByName);
    await this.assertOrigin(input.saleOriginId, soldByName);

    const items = await this.resolveItems(input.items);
    const { subtotalCents, totalCents } = computeTotals(input.items, input.shippingCents);

    const updated = await this.repositories.salesOrders.update(id, {
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      addressCep: input.addressCep,
      addressLine: input.addressLine,
      addressCity: input.addressCity,
      addressUf: input.addressUf,
      saleOriginId: input.saleOriginId,
      soldByName,
      shippingCents: input.shippingCents,
      subtotalCents,
      totalCents,
      items,
    });

    await this.syncPricingCost(id, items, null);

    return updated;
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
    await this.assertCostIsManual(id);
    return this.repositories.orderCosts.update(id, input);
  }

  async deleteCost(id: string): Promise<void> {
    await this.assertCostIsManual(id);
    return this.repositories.orderCosts.delete(id);
  }

  // O lançamento derivado da precificação é reescrito a cada gravação do
  // pedido: editá-lo à mão daria a impressão de correção que o próximo
  // salvamento desfaria em silêncio.
  private async assertCostIsManual(id: string): Promise<void> {
    const cost = await this.repositories.orderCosts.findById(id);
    if (cost?.source === "precificacao") {
      throw new Error(
        "Este lançamento vem da precificação dos itens do pedido. Ajuste o custo no item, editando o pedido.",
      );
    }
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
