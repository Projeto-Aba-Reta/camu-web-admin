import type { Repositories } from "@/lib/repositories";
import { slugify } from "@/lib/catalog/slug";
import { canonicalizeName } from "./sales-service";
import type {
  OrderPipelineStage,
  OrderStageEvent,
  SalesOrder,
  SalesOrderWithFinancials,
} from "@/types/vendas";

export interface CreateStageServiceInput {
  name: string;
  color: string;
  requiresPrinter: boolean;
  createdBy: string | null;
}

export interface UpdateStageServiceInput {
  name?: string;
  color?: string;
  requiresPrinter?: boolean;
}

export interface MoveOrderServiceInput {
  orderId: string;
  toStageId: string;
  // Só é lido quando a etapa destino exige impressora.
  printerId: string | null;
  note: string | null;
  movedBy: string | null;
}

type PipelineRepositories = Pick<
  Repositories,
  "orderPipelineStages" | "salesOrders" | "orderStageEvents" | "printers"
>;

export class SalesPipelineService {
  constructor(private readonly repositories: PipelineRepositories) {}

  // ---------------------------------------------------------------------
  // Quadro
  // ---------------------------------------------------------------------

  listStages(onlyActive = false): Promise<OrderPipelineStage[]> {
    return this.repositories.orderPipelineStages.listAll(onlyActive);
  }

  listBoardOrders(includeArchivedFinal = false): Promise<SalesOrderWithFinancials[]> {
    return this.repositories.salesOrders.listForBoard(includeArchivedFinal);
  }

  listStageEvents(orderId: string): Promise<OrderStageEvent[]> {
    return this.repositories.orderStageEvents.listByOrder(orderId);
  }

  // ---------------------------------------------------------------------
  // Movimentação
  // ---------------------------------------------------------------------

  async moveOrder(input: MoveOrderServiceInput): Promise<SalesOrder> {
    const order = await this.repositories.salesOrders.findById(input.orderId);
    if (!order) {
      throw new Error("Pedido não encontrado.");
    }

    const toStage = await this.repositories.orderPipelineStages.findById(input.toStageId);
    if (!toStage) {
      throw new Error("Etapa de destino não encontrada.");
    }
    if (!toStage.isActive) {
      throw new Error(`A etapa "${toStage.name}" está arquivada e não recebe pedidos.`);
    }

    // Impressora só sobrevive dentro de etapa que a exige: ao sair, o campo
    // é limpo e a passagem fica registrada no histórico.
    let printerId: string | null = null;
    if (toStage.requiresPrinter) {
      if (!input.printerId) {
        throw new Error(`A etapa "${toStage.name}" exige informar em qual impressora o pedido está.`);
      }
      const activePrinters = await this.repositories.printers.findActive();
      if (!activePrinters.some((printer) => printer.id === input.printerId)) {
        throw new Error("Escolha uma impressora ativa do parque.");
      }
      printerId = input.printerId;
    }

    const moved = await this.repositories.salesOrders.move(order.id, {
      stageId: toStage.id,
      currentPrinterId: printerId,
    });

    await this.repositories.orderStageEvents.record({
      orderId: order.id,
      fromStageId: order.stageId,
      toStageId: toStage.id,
      printerId,
      note: input.note,
      createdBy: input.movedBy,
    });

    return moved;
  }

  // ---------------------------------------------------------------------
  // Cadastro de etapas
  // ---------------------------------------------------------------------

  async createStage(input: CreateStageServiceInput): Promise<OrderPipelineStage> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Informe o nome da etapa.");
    }

    const slug = slugify(name);

    const stages = await this.repositories.orderPipelineStages.listAll();
    // Comparação canônica pela mesma razão das origens: os slugs semente usam
    // underscore e slugify() gera hífen (ver canonicalizeName).
    const canonical = canonicalizeName(name);
    const existing = stages.find(
      (stage) =>
        stage.slug === slug ||
        canonicalizeName(stage.slug) === canonical ||
        canonicalizeName(stage.name) === canonical,
    );
    if (existing) {
      throw new Error(`Já existe uma etapa chamada "${existing.name}".`);
    }

    const sortOrder = stages.reduce((max, stage) => Math.max(max, stage.sortOrder), 0) + 1;

    return this.repositories.orderPipelineStages.create({
      slug,
      name,
      sortOrder,
      color: input.color,
      requiresPrinter: input.requiresPrinter,
      createdBy: input.createdBy,
    });
  }

  async updateStage(id: string, input: UpdateStageServiceInput): Promise<OrderPipelineStage> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error("Informe o nome da etapa.");
    }
    return this.repositories.orderPipelineStages.update(id, {
      name: input.name?.trim(),
      color: input.color,
      requiresPrinter: input.requiresPrinter,
    });
  }

  // Reordenação: a lista chega na ordem desejada e as posições são
  // reescritas de 1..n. Normalizar aqui é o que garante posições distintas —
  // não há índice único em sort_order (ver migration).
  async reorderStages(orderedIds: string[]): Promise<void> {
    const positions = orderedIds.map((id, index) => ({ id, sortOrder: index + 1 }));
    await this.repositories.orderPipelineStages.reorder(positions);
  }

  // Trocar a inicial exige desmarcar a anterior ANTES: o índice único
  // parcial só admite uma etapa is_initial entre as ativas, então marcar a
  // nova primeiro colidiria.
  async setInitialStage(id: string): Promise<OrderPipelineStage> {
    const stages = await this.repositories.orderPipelineStages.listAll(true);
    const target = stages.find((stage) => stage.id === id);
    if (!target) {
      throw new Error("Etapa não encontrada entre as ativas.");
    }
    if (target.isFinal) {
      throw new Error("A etapa inicial não pode ser também a etapa final do funil.");
    }

    for (const stage of stages) {
      if (stage.isInitial && stage.id !== id) {
        await this.repositories.orderPipelineStages.update(stage.id, { isInitial: false });
      }
    }
    return this.repositories.orderPipelineStages.update(id, { isInitial: true });
  }

  async setFinalStage(id: string): Promise<OrderPipelineStage> {
    const stages = await this.repositories.orderPipelineStages.listAll(true);
    const target = stages.find((stage) => stage.id === id);
    if (!target) {
      throw new Error("Etapa não encontrada entre as ativas.");
    }
    if (target.isInitial) {
      throw new Error("A etapa final não pode ser também a etapa inicial do funil.");
    }

    for (const stage of stages) {
      if (stage.isFinal && stage.id !== id) {
        await this.repositories.orderPipelineStages.update(stage.id, { isFinal: false });
      }
    }
    return this.repositories.orderPipelineStages.update(id, { isFinal: true });
  }

  async archiveStage(id: string): Promise<OrderPipelineStage> {
    const stage = await this.repositories.orderPipelineStages.findById(id);
    if (!stage) {
      throw new Error("Etapa não encontrada.");
    }
    if (stage.isInitial) {
      throw new Error(
        "Esta é a etapa inicial do funil. Marque outra etapa como inicial antes de arquivá-la.",
      );
    }

    const orderCount = await this.repositories.orderPipelineStages.countOrders(id);
    if (orderCount > 0) {
      throw new Error(
        `Esta etapa tem ${orderCount} pedido(s). Mova-os para outra etapa antes de arquivá-la.`,
      );
    }

    return this.repositories.orderPipelineStages.update(id, { isActive: false });
  }

  restoreStage(id: string): Promise<OrderPipelineStage> {
    return this.repositories.orderPipelineStages.update(id, { isActive: true });
  }

  async deleteStage(id: string): Promise<void> {
    const orderCount = await this.repositories.orderPipelineStages.countOrders(id);
    if (orderCount > 0) {
      throw new Error(
        `Esta etapa é usada por ${orderCount} pedido(s) e não pode ser excluída. Arquive-a para tirá-la do quadro sem perder o histórico.`,
      );
    }
    await this.repositories.orderPipelineStages.delete(id);
  }
}
