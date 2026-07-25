import { describe, it, expect, beforeEach } from "vitest";
import { SalesService, type SalesOrderItemServiceInput } from "./sales-service";
import {
  FakeOrderCostRepository,
  FakeOrderStageEventRepository,
  FakeProductRepository,
  FakeSaleOriginRepository,
  FakeSalesOrderRepository,
} from "./sales-fakes";
import type { Product } from "@/types/catalog";

function makeProduct(id: string, name: string): Product {
  const now = new Date().toISOString();
  return {
    id,
    name,
    slug: id,
    description: null,
    category: "miniatura_colecionavel",
    sizeTier: null,
    status: "ativo",
    productType: "simples",
    productionLeadDaysMin: null,
    productionLeadDaysMax: null,
    priceCalculationId: null,
    createdBy: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("SalesService", () => {
  let orders: FakeSalesOrderRepository;
  let origins: FakeSaleOriginRepository;
  let costs: FakeOrderCostRepository;
  let events: FakeOrderStageEventRepository;
  let products: FakeProductRepository;
  let service: SalesService;

  beforeEach(() => {
    orders = new FakeSalesOrderRepository();
    origins = new FakeSaleOriginRepository();
    costs = new FakeOrderCostRepository();
    events = new FakeOrderStageEventRepository();
    products = new FakeProductRepository();

    origins.seed({ id: "origin-boca", name: "Boca-a-boca", slug: "boca_a_boca", requiresSeller: true });
    origins.seed({ id: "origin-ml", name: "Mercado Livre", slug: "mercado_livre" });
    origins.seed({ id: "origin-shein", name: "SHEIN", slug: "shein", isActive: false });
    products.products.push(makeProduct("product-leon", "Leon Sentado"));

    service = new SalesService({
      salesOrders: orders,
      saleOrigins: origins,
      orderCosts: costs,
      orderStageEvents: events,
      products,
    });
  });

  // Item padrão do catálogo. Os casos sobrescrevem só o que testam — assim o
  // acréscimo de um campo no serviço não reescreve a suíte inteira.
  const item = (
    overrides: Partial<SalesOrderItemServiceInput> = {},
  ): SalesOrderItemServiceInput => ({
    productId: "product-leon",
    productName: null,
    unitPriceCents: 4000,
    unitCostCents: null,
    qty: 1,
    variant: null,
    ...overrides,
  });

  const baseOrder = {
    customerName: "Ana",
    customerEmail: null,
    customerPhone: null,
    addressCep: null,
    addressLine: null,
    addressCity: null,
    addressUf: null,
    soldByName: null,
    stageId: "stage-inicial",
    shippingCents: 0,
    items: [item()],
  };

  it("recusa cadastro sem comprador", async () => {
    await expect(
      service.createOrder({ ...baseOrder, customerName: "  ", saleOriginId: "origin-ml" }, null),
    ).rejects.toThrow(/comprador/i);
  });

  it("recusa cadastro sem nenhum item", async () => {
    await expect(
      service.createOrder({ ...baseOrder, saleOriginId: "origin-ml", items: [] }, null),
    ).rejects.toThrow(/pelo menos um item/i);
  });

  it("recusa quantidade zero", async () => {
    await expect(
      service.createOrder(
        {
          ...baseOrder,
          saleOriginId: "origin-ml",
          items: [item({ qty: 0 })],
        },
        null,
      ),
    ).rejects.toThrow(/maior que zero/i);
  });

  it("recusa preço unitário negativo", async () => {
    await expect(
      service.createOrder(
        {
          ...baseOrder,
          saleOriginId: "origin-ml",
          items: [item({ unitPriceCents: -1 })],
        },
        null,
      ),
    ).rejects.toThrow(/negativo/i);
  });

  it("exige vendedor responsável quando a origem pede", async () => {
    await expect(
      service.createOrder({ ...baseOrder, saleOriginId: "origin-boca" }, null),
    ).rejects.toThrow(/quem vendeu/i);
  });

  it("trata vendedor só com espaços como vendedor ausente", async () => {
    await expect(
      service.createOrder({ ...baseOrder, saleOriginId: "origin-boca", soldByName: "   " }, null),
    ).rejects.toThrow(/quem vendeu/i);
  });

  it("aceita vendedor que não é usuário da plataforma", async () => {
    const order = await service.createOrder(
      { ...baseOrder, saleOriginId: "origin-boca", soldByName: "  Tia Cleide  " },
      null,
    );
    expect(order.soldByName).toBe("Tia Cleide");
  });

  it("aceita marketplace sem vendedor responsável", async () => {
    const order = await service.createOrder({ ...baseOrder, saleOriginId: "origin-ml" }, null);
    expect(order.soldByName).toBeNull();
  });

  it("recusa origem arquivada em novo pedido", async () => {
    await expect(
      service.createOrder({ ...baseOrder, saleOriginId: "origin-shein" }, null),
    ).rejects.toThrow(/arquivada/i);
  });

  it("calcula subtotal e total somando itens mais frete", async () => {
    const order = await service.createOrder(
      {
        ...baseOrder,
        saleOriginId: "origin-ml",
        shippingCents: 1200,
        items: [
          item({ qty: 2 }),
        ],
      },
      null,
    );

    expect(order.subtotalCents).toBe(8000);
    expect(order.totalCents).toBe(9200);
  });

  it("grava snapshot do nome da peça no item", async () => {
    const order = await service.createOrder({ ...baseOrder, saleOriginId: "origin-ml" }, null);
    expect(order.items[0].productName).toBe("Leon Sentado");

    await products.update("product-leon", { name: "Leon Sentado v2" });
    const stored = await orders.findById(order.id);
    expect(stored?.items[0].productName).toBe("Leon Sentado");
  });

  it("registra a primeira colocação no funil no histórico", async () => {
    const order = await service.createOrder({ ...baseOrder, saleOriginId: "origin-ml" }, "user-1");
    const history = await events.listByOrder(order.id);

    expect(history).toHaveLength(1);
    expect(history[0].fromStageId).toBeNull();
    expect(history[0].toStageId).toBe("stage-inicial");
  });

  describe("item fora do catálogo", () => {
    const offCatalog = (overrides: Partial<SalesOrderItemServiceInput> = {}) =>
      item({ productId: null, productName: "Chaveiro sob medida", ...overrides });

    it("aceita item sem peça do catálogo, guardando o nome digitado", async () => {
      const order = await service.createOrder(
        { ...baseOrder, saleOriginId: "origin-ml", items: [offCatalog()] },
        null,
      );

      expect(order.items[0].productId).toBeNull();
      expect(order.items[0].productName).toBe("Chaveiro sob medida");
    });

    it("recusa item fora do catálogo sem nome", async () => {
      await expect(
        service.createOrder(
          { ...baseOrder, saleOriginId: "origin-ml", items: [offCatalog({ productName: "  " })] },
          null,
        ),
      ).rejects.toThrow(/nome/i);
    });

    it("lança o custo estimado da precificação como custo do pedido", async () => {
      const order = await service.createOrder(
        {
          ...baseOrder,
          saleOriginId: "origin-ml",
          items: [offCatalog({ unitCostCents: 900, qty: 2 })],
        },
        "user-1",
      );

      const launched = await service.listCosts(order.id);
      expect(launched).toHaveLength(1);
      expect(launched[0].amountCents).toBe(1800);
      expect(launched[0].source).toBe("precificacao");
    });

    it("reescreve o lançamento derivado em vez de somar outro na edição", async () => {
      const order = await service.createOrder(
        { ...baseOrder, saleOriginId: "origin-ml", items: [offCatalog({ unitCostCents: 900 })] },
        null,
      );

      await service.updateOrder(order.id, {
        ...baseOrder,
        saleOriginId: "origin-ml",
        items: [offCatalog({ unitCostCents: 1500 })],
      });

      const launched = await service.listCosts(order.id);
      expect(launched).toHaveLength(1);
      expect(launched[0].amountCents).toBe(1500);
    });

    it("remove o lançamento derivado quando o custo estimado sai do pedido", async () => {
      const order = await service.createOrder(
        { ...baseOrder, saleOriginId: "origin-ml", items: [offCatalog({ unitCostCents: 900 })] },
        null,
      );

      await service.updateOrder(order.id, {
        ...baseOrder,
        saleOriginId: "origin-ml",
        items: [offCatalog({ unitCostCents: null })],
      });

      expect(await service.listCosts(order.id)).toHaveLength(0);
    });

    it("não encosta nos lançamentos manuais do pedido", async () => {
      const order = await service.createOrder(
        { ...baseOrder, saleOriginId: "origin-ml", items: [offCatalog({ unitCostCents: 900 })] },
        null,
      );
      await service.createCost({
        orderId: order.id,
        amountCents: 500,
        category: "frete",
        description: "Correios",
        createdBy: null,
      });

      await service.updateOrder(order.id, {
        ...baseOrder,
        saleOriginId: "origin-ml",
        items: [offCatalog({ unitCostCents: 1200 })],
      });

      const launched = await service.listCosts(order.id);
      expect(launched.map((cost) => cost.amountCents).sort((a, b) => a - b)).toEqual([500, 1200]);
    });

    it("recusa editar à mão o lançamento vindo da precificação", async () => {
      const order = await service.createOrder(
        { ...baseOrder, saleOriginId: "origin-ml", items: [offCatalog({ unitCostCents: 900 })] },
        null,
      );
      const [derived] = await service.listCosts(order.id);

      await expect(service.updateCost(derived.id, { amountCents: 100 })).rejects.toThrow(
        /precificação/i,
      );
      await expect(service.deleteCost(derived.id)).rejects.toThrow(/precificação/i);
    });
  });

  it("recalcula o total ao adicionar item na edição", async () => {
    const order = await service.createOrder({ ...baseOrder, saleOriginId: "origin-ml" }, null);

    const updated = await service.updateOrder(order.id, {
      ...baseOrder,
      saleOriginId: "origin-ml",
      items: [
        item(),
        item({ unitPriceCents: 2500, qty: 2 }),
      ],
    });

    expect(updated.totalCents).toBe(9000);
  });

  describe("origens de venda", () => {
    it("recusa origem com slug duplicado", async () => {
      await expect(
        service.createOrigin({ name: "Mercado Livre", requiresSeller: false, createdBy: null }),
      ).rejects.toThrow(/já existe/i);
    });

    it("deriva o slug do nome e põe a origem no fim da lista", async () => {
      const origin = await service.createOrigin({
        name: "Feira de artesanato do bairro",
        requiresSeller: false,
        createdBy: null,
      });

      expect(origin.slug).toBe("feira-de-artesanato-do-bairro");
      expect(origin.sortOrder).toBe(4);
    });

    it("recusa excluir origem já usada por pedido", async () => {
      origins.orderCountById.set("origin-ml", 3);
      await expect(service.deleteOrigin("origin-ml")).rejects.toThrow(/3 pedido/);
    });

    it("arquiva origem em uso sem apagá-la", async () => {
      const archived = await service.setOriginActive("origin-ml", false);
      expect(archived.isActive).toBe(false);
      expect(await origins.findById("origin-ml")).not.toBeNull();
    });
  });

  describe("custo real", () => {
    it("recusa lançamento de valor zero", async () => {
      await expect(
        service.createCost({
          orderId: "order-1",
          amountCents: 0,
          category: "filamento",
          description: null,
          createdBy: null,
        }),
      ).rejects.toThrow(/maior que zero/i);
    });

    it("recusa lançamento negativo, orientando a editar ou excluir", async () => {
      await expect(
        service.createCost({
          orderId: "order-1",
          amountCents: -500,
          category: "filamento",
          description: null,
          createdBy: null,
        }),
      ).rejects.toThrow(/edite-o ou exclua-o/i);
    });

    it("recusa categoria fora do conjunto fechado", async () => {
      await expect(
        service.createCost({
          orderId: "order-1",
          amountCents: 500,
          // Categoria inexistente é justamente o que o teste verifica.
          category: "energia" as never,
          description: null,
          createdBy: null,
        }),
      ).rejects.toThrow(/inválida/i);
    });

    it("soma múltiplos lançamentos do mesmo pedido", async () => {
      await service.createCost({ orderId: "order-1", amountCents: 1450, category: "filamento", description: null, createdBy: null });
      await service.createCost({ orderId: "order-1", amountCents: 320, category: "embalagem", description: null, createdBy: null });
      await service.createCost({ orderId: "order-1", amountCents: 2190, category: "frete", description: null, createdBy: null });

      const lancamentos = await service.listCosts("order-1");
      const total = lancamentos.reduce((sum, cost) => sum + cost.amountCents, 0);
      expect(total).toBe(3960);
    });
  });
});
