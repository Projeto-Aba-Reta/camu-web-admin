import { describe, it, expect, beforeEach } from "vitest";
import { OrderTrackingService } from "./order-tracking-service";
import { FakeOrderTrackingRepository, FakeSalesOrderRepository } from "./sales-fakes";

describe("OrderTrackingService", () => {
  let orders: FakeSalesOrderRepository;
  let tracking: FakeOrderTrackingRepository;
  let service: OrderTrackingService;

  beforeEach(async () => {
    orders = new FakeSalesOrderRepository();
    tracking = new FakeOrderTrackingRepository(orders);

    await orders.create({
      customerName: "Ana",
      customerEmail: null,
      customerPhone: null,
      addressCep: null,
      addressLine: null,
      addressCity: null,
      addressUf: null,
      saleOriginId: "origin-ml",
      soldByName: null,
      stageId: "stage-aguardando",
      shippingCents: 0,
      subtotalCents: 4000,
      totalCents: 4000,
      items: [],
    });

    service = new OrderTrackingService({ orderTracking: tracking, salesOrders: orders });
  });

  describe("atualizar status", () => {
    it("recusa status fora do vocabulário", async () => {
      await expect(
        service.updateStatus({ orderId: "order-1", status: "em_transito", note: null }),
      ).rejects.toThrow(/vocabulário/i);
    });

    it("recusa status igual ao atual", async () => {
      await expect(
        service.updateStatus({ orderId: "order-1", status: "pending", note: null }),
      ).rejects.toThrow(/já está/i);
    });

    it("aceita mover para frente e grava evento com a nota", async () => {
      const event = await service.updateStatus({
        orderId: "order-1",
        status: "paid",
        note: "pagamento confirmado",
      });

      expect(event.status).toBe("paid");
      expect(event.note).toBe("pagamento confirmado");

      const order = await orders.findById("order-1");
      expect(order?.status).toBe("paid");
    });

    it("aceita mover para trás por retrabalho, preservando o histórico", async () => {
      await service.updateStatus({ orderId: "order-1", status: "shipped", note: null });
      await service.updateStatus({ orderId: "order-1", status: "in_production", note: "refazer peça" });

      const history = await tracking.listEvents("order-1");
      expect(history).toHaveLength(2);
      expect(history[0].status).toBe("shipped");
      expect(history[1].status).toBe("in_production");
    });

    it("aceita nota omitida", async () => {
      const event = await service.updateStatus({ orderId: "order-1", status: "paid", note: null });
      expect(event.note).toBeNull();
    });
  });

  describe("sugestão de status a partir da etapa do funil", () => {
    it("sugere o status mapeado quando diferente do atual", () => {
      expect(service.suggestCustomerStatus("enviado", "finishing")).toBe("shipped");
    });

    it("não sugere nada para etapa sem mapeamento", () => {
      expect(service.suggestCustomerStatus("embalando", "pending")).toBeNull();
    });

    it("não sugere nada quando o status já é o mapeado", () => {
      expect(service.suggestCustomerStatus("enviado", "shipped")).toBeNull();
    });
  });
});
