import { describe, it, expect, beforeEach } from "vitest";
import { SalesPipelineService } from "./sales-pipeline-service";
import {
  FakeOrderPipelineStageRepository,
  FakeOrderStageEventRepository,
  FakePrinterRepository,
  FakeSalesOrderRepository,
} from "./sales-fakes";

describe("SalesPipelineService", () => {
  let stages: FakeOrderPipelineStageRepository;
  let orders: FakeSalesOrderRepository;
  let events: FakeOrderStageEventRepository;
  let printers: FakePrinterRepository;
  let service: SalesPipelineService;

  beforeEach(async () => {
    stages = new FakeOrderPipelineStageRepository();
    orders = new FakeSalesOrderRepository();
    events = new FakeOrderStageEventRepository();
    printers = new FakePrinterRepository();

    stages.seed({ id: "stage-modelagem", name: "Pensando na modelagem", sortOrder: 1, isInitial: true });
    stages.seed({ id: "stage-aguardando", name: "Aguardando impressão", sortOrder: 2 });
    stages.seed({ id: "stage-imprimindo", name: "Imprimindo", sortOrder: 3, requiresPrinter: true });
    stages.seed({ id: "stage-embalando", name: "Embalando", sortOrder: 4 });
    stages.seed({ id: "stage-enviado", name: "Enviado", sortOrder: 5, isFinal: true });
    stages.seed({ id: "stage-arquivada", name: "Etapa velha", sortOrder: 6, isActive: false });

    printers.printers.push({
      id: "printer-a1",
      name: "Bambu Lab A1 Combo",
      model: "A1",
      depreciationPerHour: 1,
      isActive: true,
      validFrom: new Date().toISOString(),
      createdBy: null,
    });
    printers.printers.push({
      id: "printer-antiga",
      name: "Ender 3 velha",
      model: "Ender",
      depreciationPerHour: 1,
      isActive: false,
      validFrom: new Date().toISOString(),
      createdBy: null,
    });

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

    service = new SalesPipelineService({
      orderPipelineStages: stages,
      salesOrders: orders,
      orderStageEvents: events,
      printers,
    });
  });

  describe("movimentação", () => {
    it("move o pedido e registra a passagem no histórico com o autor", async () => {
      const moved = await service.moveOrder({
        orderId: "order-1",
        toStageId: "stage-embalando",
        printerId: null,
        note: null,
        movedBy: "user-1",
      });

      expect(moved.stageId).toBe("stage-embalando");

      const history = await events.listByOrder("order-1");
      expect(history).toHaveLength(1);
      expect(history[0].fromStageId).toBe("stage-aguardando");
      expect(history[0].createdBy).toBe("user-1");
    });

    it("aceita voltar o pedido para uma etapa anterior", async () => {
      await service.moveOrder({
        orderId: "order-1",
        toStageId: "stage-embalando",
        printerId: null,
        note: null,
        movedBy: null,
      });
      const back = await service.moveOrder({
        orderId: "order-1",
        toStageId: "stage-aguardando",
        printerId: null,
        note: "peça saiu com defeito",
        movedBy: null,
      });

      expect(back.stageId).toBe("stage-aguardando");
      expect(await events.listByOrder("order-1")).toHaveLength(2);
    });

    it("recusa movimentação para etapa arquivada", async () => {
      await expect(
        service.moveOrder({
          orderId: "order-1",
          toStageId: "stage-arquivada",
          printerId: null,
          note: null,
          movedBy: null,
        }),
      ).rejects.toThrow(/arquivada/i);
    });

    it("exige impressora na etapa que a requer", async () => {
      await expect(
        service.moveOrder({
          orderId: "order-1",
          toStageId: "stage-imprimindo",
          printerId: null,
          note: null,
          movedBy: null,
        }),
      ).rejects.toThrow(/impressora/i);
    });

    it("recusa impressora inativa", async () => {
      await expect(
        service.moveOrder({
          orderId: "order-1",
          toStageId: "stage-imprimindo",
          printerId: "printer-antiga",
          note: null,
          movedBy: null,
        }),
      ).rejects.toThrow(/ativa/i);
    });

    it("registra a impressora ao entrar na etapa de impressão", async () => {
      const moved = await service.moveOrder({
        orderId: "order-1",
        toStageId: "stage-imprimindo",
        printerId: "printer-a1",
        note: null,
        movedBy: null,
      });

      expect(moved.currentPrinterId).toBe("printer-a1");
    });

    it("limpa a impressora ao sair da etapa, preservando-a no histórico", async () => {
      await service.moveOrder({
        orderId: "order-1",
        toStageId: "stage-imprimindo",
        printerId: "printer-a1",
        note: null,
        movedBy: null,
      });
      const moved = await service.moveOrder({
        orderId: "order-1",
        toStageId: "stage-embalando",
        printerId: null,
        note: null,
        movedBy: null,
      });

      expect(moved.currentPrinterId).toBeNull();

      const history = await events.listByOrder("order-1");
      expect(history[0].printerId).toBe("printer-a1");
      expect(history[1].printerId).toBeNull();
    });
  });

  describe("cadastro de etapas", () => {
    it("recusa arquivar etapa que ainda tem pedidos", async () => {
      stages.orderCountById.set("stage-embalando", 3);
      await expect(service.archiveStage("stage-embalando")).rejects.toThrow(/3 pedido/);
    });

    it("recusa arquivar a etapa inicial", async () => {
      await expect(service.archiveStage("stage-modelagem")).rejects.toThrow(/etapa inicial/i);
    });

    it("arquiva etapa vazia", async () => {
      const archived = await service.archiveStage("stage-embalando");
      expect(archived.isActive).toBe(false);
    });

    it("desmarca a etapa inicial anterior ao trocar", async () => {
      await service.setInitialStage("stage-aguardando");

      const all = await stages.listAll();
      expect(all.filter((stage) => stage.isInitial).map((stage) => stage.id)).toEqual([
        "stage-aguardando",
      ]);
    });

    it("recusa marcar a etapa final como inicial", async () => {
      await expect(service.setInitialStage("stage-enviado")).rejects.toThrow(/final/i);
    });

    it("normaliza as posições ao reordenar", async () => {
      await service.reorderStages([
        "stage-embalando",
        "stage-modelagem",
        "stage-aguardando",
        "stage-imprimindo",
        "stage-enviado",
      ]);

      const all = await stages.listAll();
      const positions = all.map((stage) => stage.sortOrder);
      expect(new Set(positions).size).toBe(positions.length);
      expect(all[0].id).toBe("stage-embalando");
    });

    it("recusa etapa com nome que gera slug duplicado", async () => {
      await expect(
        service.createStage({ name: "Imprimindo", color: "blue", requiresPrinter: true, createdBy: null }),
      ).rejects.toThrow(/já existe/i);
    });

    it("cria etapa nova no fim da lista", async () => {
      const stage = await service.createStage({
        name: "Aguardando revisão",
        color: "rose",
        requiresPrinter: false,
        createdBy: null,
      });

      expect(stage.slug).toBe("aguardando-revisao");
      expect(stage.sortOrder).toBe(7);
    });
  });
});
