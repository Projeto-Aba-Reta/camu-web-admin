// Fakes em memória do domínio de Vendas, compartilhados pelos testes dos três
// serviços da área. Mesmo padrão de inventory-service.test.ts: implementam a
// interface do repositório real e guardam estado em memória.
//
// Arquivo sem sufixo .test para poder ser importado pelos três arquivos de
// teste sem que o vitest tente executá-lo como suíte.

import type {
  CreateSaleOriginInput,
  ISaleOriginRepository,
  UpdateSaleOriginInput,
} from "@/lib/repositories/interfaces/sale-origin-repository.interface";
import type {
  CreateOrderPipelineStageInput,
  IOrderPipelineStageRepository,
  UpdateOrderPipelineStageInput,
} from "@/lib/repositories/interfaces/order-pipeline-stage-repository.interface";
import type {
  CreateSalesOrderInput,
  ISalesOrderRepository,
  MoveSalesOrderInput,
  SalesOrderFilters,
  UpdateSalesOrderInput,
} from "@/lib/repositories/interfaces/sales-order-repository.interface";
import type {
  CreateOrderCostInput,
  IOrderCostRepository,
  UpdateOrderCostInput,
} from "@/lib/repositories/interfaces/order-cost-repository.interface";
import type {
  IOrderStageEventRepository,
  RecordStageEventInput,
} from "@/lib/repositories/interfaces/order-stage-event-repository.interface";
import type { ISalesResultRepository } from "@/lib/repositories/interfaces/sales-result-repository.interface";
import type {
  CreatePrinterInput,
  IPrinterRepository,
} from "@/lib/repositories/interfaces/printer-repository.interface";
import type {
  CreateProductInput,
  IProductRepository,
  UpdateProductInput,
} from "@/lib/repositories/interfaces/product-repository.interface";
import type { Product } from "@/types/catalog";
import type { Printer } from "@/types/pricing";
import type {
  MonthlySalesResultRow,
  OrderCost,
  OrderCostCategory,
  OrderPipelineStage,
  OrderStageEvent,
  SaleOrigin,
  SalesOrder,
  SalesOrderWithFinancials,
} from "@/types/vendas";

export class FakeSaleOriginRepository implements ISaleOriginRepository {
  public origins: SaleOrigin[] = [];
  public orderCountById = new Map<string, number>();
  private counter = 0;

  async listAll(onlyActive = false): Promise<SaleOrigin[]> {
    const all = [...this.origins].sort((a, b) => a.sortOrder - b.sortOrder);
    return onlyActive ? all.filter((origin) => origin.isActive) : all;
  }

  async findById(id: string): Promise<SaleOrigin | null> {
    return this.origins.find((origin) => origin.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<SaleOrigin | null> {
    return this.origins.find((origin) => origin.slug === slug) ?? null;
  }

  async create(input: CreateSaleOriginInput): Promise<SaleOrigin> {
    this.counter += 1;
    const origin: SaleOrigin = {
      id: `origin-${this.counter}`,
      slug: input.slug,
      name: input.name,
      sortOrder: input.sortOrder,
      isActive: true,
      requiresSeller: input.requiresSeller,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.origins.push(origin);
    return origin;
  }

  async update(id: string, input: UpdateSaleOriginInput): Promise<SaleOrigin> {
    const origin = this.origins.find((candidate) => candidate.id === id);
    if (!origin) throw new Error("origem não encontrada");
    if (input.name !== undefined) origin.name = input.name;
    if (input.sortOrder !== undefined) origin.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) origin.isActive = input.isActive;
    if (input.requiresSeller !== undefined) origin.requiresSeller = input.requiresSeller;
    return origin;
  }

  async delete(id: string): Promise<void> {
    this.origins = this.origins.filter((origin) => origin.id !== id);
  }

  async countOrders(id: string): Promise<number> {
    return this.orderCountById.get(id) ?? 0;
  }

  // Helper de teste.
  seed(origin: Partial<SaleOrigin> & { id: string; name: string }): SaleOrigin {
    const full: SaleOrigin = {
      slug: origin.slug ?? origin.id,
      sortOrder: origin.sortOrder ?? this.origins.length + 1,
      isActive: origin.isActive ?? true,
      requiresSeller: origin.requiresSeller ?? false,
      createdBy: null,
      createdAt: new Date().toISOString(),
      ...origin,
    };
    this.origins.push(full);
    return full;
  }
}

export class FakeOrderPipelineStageRepository implements IOrderPipelineStageRepository {
  public stages: OrderPipelineStage[] = [];
  public orderCountById = new Map<string, number>();
  private counter = 0;

  async listAll(onlyActive = false): Promise<OrderPipelineStage[]> {
    const all = [...this.stages].sort((a, b) => a.sortOrder - b.sortOrder);
    return onlyActive ? all.filter((stage) => stage.isActive) : all;
  }

  async findById(id: string): Promise<OrderPipelineStage | null> {
    return this.stages.find((stage) => stage.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<OrderPipelineStage | null> {
    return this.stages.find((stage) => stage.slug === slug) ?? null;
  }

  async findInitial(): Promise<OrderPipelineStage | null> {
    return this.stages.find((stage) => stage.isInitial && stage.isActive) ?? null;
  }

  async create(input: CreateOrderPipelineStageInput): Promise<OrderPipelineStage> {
    this.counter += 1;
    const stage: OrderPipelineStage = {
      id: `stage-${this.counter}`,
      slug: input.slug,
      name: input.name,
      sortOrder: input.sortOrder,
      color: input.color,
      isActive: true,
      isInitial: false,
      isFinal: false,
      requiresPrinter: input.requiresPrinter,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.stages.push(stage);
    return stage;
  }

  async update(id: string, input: UpdateOrderPipelineStageInput): Promise<OrderPipelineStage> {
    const stage = this.stages.find((candidate) => candidate.id === id);
    if (!stage) throw new Error("etapa não encontrada");
    if (input.name !== undefined) stage.name = input.name;
    if (input.sortOrder !== undefined) stage.sortOrder = input.sortOrder;
    if (input.color !== undefined) stage.color = input.color;
    if (input.isActive !== undefined) stage.isActive = input.isActive;
    if (input.isInitial !== undefined) stage.isInitial = input.isInitial;
    if (input.isFinal !== undefined) stage.isFinal = input.isFinal;
    if (input.requiresPrinter !== undefined) stage.requiresPrinter = input.requiresPrinter;
    return stage;
  }

  async delete(id: string): Promise<void> {
    this.stages = this.stages.filter((stage) => stage.id !== id);
  }

  async reorder(positions: { id: string; sortOrder: number }[]): Promise<void> {
    for (const position of positions) {
      const stage = this.stages.find((candidate) => candidate.id === position.id);
      if (stage) stage.sortOrder = position.sortOrder;
    }
  }

  async countOrders(id: string): Promise<number> {
    return this.orderCountById.get(id) ?? 0;
  }

  seed(stage: Partial<OrderPipelineStage> & { id: string; name: string }): OrderPipelineStage {
    const full: OrderPipelineStage = {
      slug: stage.slug ?? stage.id,
      sortOrder: stage.sortOrder ?? this.stages.length + 1,
      color: stage.color ?? "slate",
      isActive: stage.isActive ?? true,
      isInitial: stage.isInitial ?? false,
      isFinal: stage.isFinal ?? false,
      requiresPrinter: stage.requiresPrinter ?? false,
      createdBy: null,
      createdAt: new Date().toISOString(),
      ...stage,
    };
    this.stages.push(full);
    return full;
  }
}

function withFinancials(order: SalesOrder, costCents: number, costEntries: number): SalesOrderWithFinancials {
  return {
    ...order,
    financials: {
      orderId: order.id,
      revenueCents: order.totalCents,
      costCents,
      profitCents: order.totalCents - costCents,
      costEntries,
    },
  };
}

export class FakeSalesOrderRepository implements ISalesOrderRepository {
  public orders: SalesOrder[] = [];
  public costCentsByOrderId = new Map<string, { costCents: number; costEntries: number }>();
  private counter = 0;

  private hydrate(order: SalesOrder): SalesOrderWithFinancials {
    const costs = this.costCentsByOrderId.get(order.id) ?? { costCents: 0, costEntries: 0 };
    return withFinancials(order, costs.costCents, costs.costEntries);
  }

  async list(filters: SalesOrderFilters = {}): Promise<SalesOrderWithFinancials[]> {
    return this.orders
      .filter((order) => !filters.saleOriginId || order.saleOriginId === filters.saleOriginId)
      .filter((order) => !filters.stageId || order.stageId === filters.stageId)
      .filter(
        (order) =>
          !filters.soldByName ||
          (order.soldByName ?? "").toLowerCase().includes(filters.soldByName.toLowerCase()),
      )
      .map((order) => this.hydrate(order));
  }

  async listSellerNames(): Promise<string[]> {
    const names = new Set<string>();
    for (const order of this.orders) {
      if (order.soldByName) names.add(order.soldByName);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  async listForBoard(): Promise<SalesOrderWithFinancials[]> {
    return this.orders.map((order) => this.hydrate(order));
  }

  async findById(id: string): Promise<SalesOrderWithFinancials | null> {
    const order = this.orders.find((candidate) => candidate.id === id);
    return order ? this.hydrate(order) : null;
  }

  async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    this.counter += 1;
    const now = new Date().toISOString();
    const order: SalesOrder = {
      id: `order-${this.counter}`,
      orderCode: `CM-${4820 + this.counter}`,
      status: "pending",
      paymentStatus: "pending",
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      addressCep: input.addressCep,
      addressLine: input.addressLine,
      addressCity: input.addressCity,
      addressUf: input.addressUf,
      saleOriginId: input.saleOriginId,
      soldByName: input.soldByName,
      stageId: input.stageId,
      currentPrinterId: null,
      subtotalCents: input.subtotalCents,
      shippingCents: input.shippingCents,
      totalCents: input.totalCents,
      createdAt: now,
      updatedAt: now,
      items: input.items.map((item, index) => ({
        id: `item-${this.counter}-${index}`,
        orderId: `order-${this.counter}`,
        productId: item.productId,
        productName: item.productName,
        variant: item.variant,
        unitPriceCents: item.unitPriceCents,
        unitCostCents: item.unitCostCents,
        qty: item.qty,
      })),
    };
    this.orders.push(order);
    return order;
  }

  async update(id: string, input: UpdateSalesOrderInput): Promise<SalesOrder> {
    const order = this.orders.find((candidate) => candidate.id === id);
    if (!order) throw new Error("pedido não encontrado");
    if (input.customerName !== undefined) order.customerName = input.customerName;
    if (input.saleOriginId !== undefined) order.saleOriginId = input.saleOriginId;
    if (input.soldByName !== undefined) order.soldByName = input.soldByName;
    if (input.shippingCents !== undefined) order.shippingCents = input.shippingCents;
    if (input.subtotalCents !== undefined) order.subtotalCents = input.subtotalCents;
    if (input.totalCents !== undefined) order.totalCents = input.totalCents;
    if (input.items !== undefined) {
      order.items = input.items.map((item, index) => ({
        id: `item-${id}-${index}`,
        orderId: id,
        productId: item.productId,
        productName: item.productName,
        variant: item.variant,
        unitPriceCents: item.unitPriceCents,
        unitCostCents: item.unitCostCents,
        qty: item.qty,
      }));
    }
    return order;
  }

  async move(id: string, input: MoveSalesOrderInput): Promise<SalesOrder> {
    const order = this.orders.find((candidate) => candidate.id === id);
    if (!order) throw new Error("pedido não encontrado");
    order.stageId = input.stageId;
    order.currentPrinterId = input.currentPrinterId;
    return order;
  }

  async delete(id: string): Promise<void> {
    this.orders = this.orders.filter((order) => order.id !== id);
  }
}

export class FakeOrderCostRepository implements IOrderCostRepository {
  public costs: OrderCost[] = [];
  private counter = 0;

  async listByOrder(orderId: string): Promise<OrderCost[]> {
    return this.costs.filter((cost) => cost.orderId === orderId);
  }

  async findById(id: string): Promise<OrderCost | null> {
    return this.costs.find((cost) => cost.id === id) ?? null;
  }

  async create(input: CreateOrderCostInput): Promise<OrderCost> {
    this.counter += 1;
    const cost: OrderCost = {
      id: `cost-${this.counter}`,
      orderId: input.orderId,
      amountCents: input.amountCents,
      category: input.category,
      description: input.description,
      source: input.source ?? "manual",
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.costs.push(cost);
    return cost;
  }

  async update(id: string, input: UpdateOrderCostInput): Promise<OrderCost> {
    const cost = this.costs.find((candidate) => candidate.id === id);
    if (!cost) throw new Error("custo não encontrado");
    if (input.amountCents !== undefined) cost.amountCents = input.amountCents;
    if (input.category !== undefined) cost.category = input.category as OrderCostCategory;
    if (input.description !== undefined) cost.description = input.description;
    return cost;
  }

  async delete(id: string): Promise<void> {
    this.costs = this.costs.filter((cost) => cost.id !== id);
  }
}

export class FakeOrderStageEventRepository implements IOrderStageEventRepository {
  public events: OrderStageEvent[] = [];
  private counter = 0;

  async listByOrder(orderId: string): Promise<OrderStageEvent[]> {
    return this.events.filter((event) => event.orderId === orderId);
  }

  async record(input: RecordStageEventInput): Promise<OrderStageEvent> {
    this.counter += 1;
    const event: OrderStageEvent = {
      id: `event-${this.counter}`,
      orderId: input.orderId,
      fromStageId: input.fromStageId,
      toStageId: input.toStageId,
      printerId: input.printerId,
      note: input.note,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }
}

export class FakeSalesResultRepository implements ISalesResultRepository {
  public rows: MonthlySalesResultRow[] = [];

  async listByMonthRange(fromMonth: string, toMonth: string): Promise<MonthlySalesResultRow[]> {
    return this.rows.filter((row) => row.month >= fromMonth && row.month <= toMonth);
  }
}

export class FakePrinterRepository implements IPrinterRepository {
  public printers: Printer[] = [];

  async findActive(): Promise<Printer[]> {
    return this.printers.filter((printer) => printer.isActive);
  }

  async findAll(): Promise<Printer[]> {
    return this.printers;
  }

  async findById(id: string): Promise<Printer | null> {
    return this.printers.find((printer) => printer.id === id) ?? null;
  }

  async create(input: CreatePrinterInput): Promise<Printer> {
    const printer: Printer = {
      id: `printer-${this.printers.length + 1}`,
      name: input.name,
      model: input.model,
      depreciationPerHour: input.depreciationPerHour,
      isActive: true,
      validFrom: new Date().toISOString(),
      createdBy: input.createdBy,
    };
    this.printers.push(printer);
    return printer;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const printer = this.printers.find((candidate) => candidate.id === id);
    if (printer) printer.isActive = isActive;
  }
}

export class FakeProductRepository implements IProductRepository {
  public products: Product[] = [];

  async findById(id: string): Promise<Product | null> {
    return this.products.find((product) => product.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.products.find((product) => product.slug === slug) ?? null;
  }

  async findAll(): Promise<Product[]> {
    return this.products;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const now = new Date().toISOString();
    const product: Product = {
      id: `product-${this.products.length + 1}`,
      name: input.name,
      slug: input.slug,
      description: input.description,
      category: input.category,
      sizeTier: null,
      status: "rascunho",
      productType: input.productType ?? "simples",
      productionLeadDaysMin: input.productionLeadDaysMin ?? null,
      productionLeadDaysMax: input.productionLeadDaysMax ?? null,
      priceCalculationId: null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.products.push(product);
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = this.products.find((candidate) => candidate.id === id);
    if (!product) throw new Error("peça não encontrada");
    if (input.name !== undefined) product.name = input.name;
    return product;
  }

  async delete(id: string): Promise<void> {
    this.products = this.products.filter((product) => product.id !== id);
  }
}
