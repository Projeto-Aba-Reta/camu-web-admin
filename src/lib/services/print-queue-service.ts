import type { Repositories } from "@/lib/repositories";
import type { InventoryService } from "@/lib/services/inventory-service";
import type { ISlackNotificationService } from "@/lib/services/slack-notification-service";
import type { Product } from "@/types/catalog";
import type { Printer } from "@/types/pricing";
import type { PrintQueueItem } from "@/types/print-queue";

export interface AddToQueueInput {
  productId: string;
  quantity: number;
  createdBy: string | null;
}

export interface PrinterAvailability {
  printer: Printer;
  // Impressora ativa, elegível (com ficha de fatiamento cadastrada para o
  // produto) e sem nenhum item `imprimindo` no momento — estado derivado em
  // tempo de leitura, não persistido (ver design.md decisão "'Ociosa' é
  // estado derivado, não persistido").
  isIdle: boolean;
}

type PrintQueueRepositories = Pick<Repositories, "printQueueItems" | "printers" | "products" | "slicingSheets">;

function formatDuration(durationMs: number | null): string {
  if (durationMs === null || durationMs < 0) return "duração desconhecida";
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h${minutes.toString().padStart(2, "0")}min`;
}

function buildCompletionMessage(params: {
  product: Product;
  quantity: number;
  printer: Printer | null;
  durationMs: number | null;
}): string {
  const printerName = params.printer?.name ?? "impressora não identificada";
  return `Impressão concluída: ${params.quantity}x ${params.product.name} na ${printerName} — duração: ${formatDuration(params.durationMs)}`;
}

export class PrintQueueService {
  constructor(
    private readonly repositories: PrintQueueRepositories,
    private readonly inventoryService: InventoryService,
    private readonly slackNotificationService: ISlackNotificationService,
  ) {}

  // Produto precisa ter pelo menos uma ficha de fatiamento cadastrada (peso
  // e materiais conhecidos para alguma impressora) — ver Requirement
  // "Produto sem ficha de fatiamento cadastrada".
  async addToQueue(input: AddToQueueInput): Promise<PrintQueueItem> {
    if (input.quantity <= 0) {
      throw new Error("Quantidade deve ser maior que zero.");
    }

    const product = await this.repositories.products.findById(input.productId);
    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    const sheets = await this.repositories.slicingSheets.findByProductId(input.productId);
    if (sheets.length === 0) {
      throw new Error(
        "Produto precisa ter uma ficha de fatiamento cadastrada para pelo menos uma impressora antes de entrar na fila.",
      );
    }

    return this.repositories.printQueueItems.create({
      productId: input.productId,
      quantity: input.quantity,
      createdBy: input.createdBy,
    });
  }

  // Só impressoras com ficha de fatiamento cadastrada para o produto são
  // elegíveis — ver Requirement "Início de impressão com sugestão de
  // impressora ociosa" (impressora sem ficha não pode ser usada no item).
  async listPrinterAvailability(productId: string): Promise<PrinterAvailability[]> {
    const [printers, printingItems, sheets] = await Promise.all([
      this.repositories.printers.findActive(),
      this.repositories.printQueueItems.listByStatus(["imprimindo"]),
      this.repositories.slicingSheets.findByProductId(productId),
    ]);

    const eligiblePrinterIds = new Set(sheets.map((sheet) => sheet.printerId));
    const occupiedPrinterIds = new Set(
      printingItems.map((item) => item.printerId).filter((id): id is string => id !== null),
    );

    return printers
      .filter((printer) => eligiblePrinterIds.has(printer.id))
      .map((printer) => ({
        printer,
        isIdle: !occupiedPrinterIds.has(printer.id),
      }));
  }

  // Impressora não pode ter dois itens `imprimindo` ao mesmo tempo — checado
  // aqui e reforçado pelo índice único parcial no banco (ver Requirement
  // "Impressora já ocupada"). Ao iniciar com sucesso, copia os materiais da
  // ficha para o item (snapshot) e calcula o horário estimado de término —
  // ver Requirement "Início bem-sucedido copia a ficha para o item".
  async startPrinting(itemId: string, printerId: string): Promise<PrintQueueItem> {
    const item = await this.repositories.printQueueItems.findById(itemId);
    if (!item) {
      throw new Error("Item da fila não encontrado.");
    }
    if (item.status !== "na_fila") {
      throw new Error("Apenas itens na fila podem ser iniciados.");
    }

    const printer = await this.repositories.printers.findById(printerId);
    if (!printer || !printer.isActive) {
      throw new Error("Selecione uma impressora ativa.");
    }

    const sheet = await this.repositories.slicingSheets.findByProductAndPrinter(item.productId, printerId);
    if (!sheet) {
      throw new Error(
        `É preciso cadastrar uma ficha de fatiamento para ${printer.name} antes de usá-la neste item.`,
      );
    }

    const printingItems = await this.repositories.printQueueItems.listByStatus(["imprimindo"]);
    const isOccupied = printingItems.some((existing) => existing.printerId === printerId);
    if (isOccupied) {
      throw new Error(`Impressora ${printer.name} já está imprimindo outro item.`);
    }

    const startedAt = new Date();
    const expectedFinishAt = new Date(startedAt.getTime() + sheet.printHours * 60 * 60 * 1000);

    const updated = await this.repositories.printQueueItems.update(itemId, {
      status: "imprimindo",
      printerId,
      startedAt: startedAt.toISOString(),
      expectedFinishAt: expectedFinishAt.toISOString(),
    });

    await this.repositories.printQueueItems.setItemMaterials(
      itemId,
      sheet.materials.map((material) => ({
        materialId: material.materialId,
        pieceGrams: material.pieceGrams,
        supportGrams: material.supportGrams,
      })),
    );

    return updated;
  }

  // Ao concluir — manualmente ou via completeExpiredPrintings — gera uma
  // movimentação de baixa por material snapshotado no início (peça +
  // suporte, × quantidade do item) e uma única movimentação de entrada de
  // peça pronta, via InventoryService — reaproveita a lógica de ledger
  // existente, não duplica — e notifica o Slack. Falha no Slack nunca
  // impede a conclusão nem as movimentações (ver Requirement "Webhook não
  // configurado ou falha de envio").
  async completePrinting(itemId: string, userId: string | null): Promise<PrintQueueItem> {
    const item = await this.repositories.printQueueItems.findById(itemId);
    if (!item) {
      throw new Error("Item da fila não encontrado.");
    }
    if (item.status !== "imprimindo") {
      throw new Error("Apenas itens em impressão podem ser concluídos.");
    }

    const product = await this.repositories.products.findById(item.productId);
    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    const materials = await this.repositories.printQueueItems.findMaterialsByItemId(itemId);
    if (materials.length === 0) {
      throw new Error("Item sem materiais registrados no início da impressão — não é possível concluir.");
    }

    for (const material of materials) {
      const consumedQuantity = (material.pieceGrams + material.supportGrams) * item.quantity;
      await this.inventoryService.registerMaterialMovement({
        materialId: material.materialId,
        quantity: -consumedQuantity,
        movementType: "consumo_producao",
        printerId: item.printerId,
        productId: item.productId,
        notes: null,
        createdBy: userId,
      });
    }

    await this.inventoryService.registerProductMovement({
      productId: item.productId,
      quantity: item.quantity,
      movementType: "producao",
      notes: null,
      createdBy: userId,
    });

    const finishedAt = new Date();
    const updated = await this.repositories.printQueueItems.update(itemId, {
      status: "concluido",
      finishedAt: finishedAt.toISOString(),
    });

    const printer = item.printerId ? await this.repositories.printers.findById(item.printerId) : null;
    const durationMs = item.startedAt ? finishedAt.getTime() - new Date(item.startedAt).getTime() : null;

    try {
      await this.slackNotificationService.sendMessage(
        buildCompletionMessage({ product, quantity: item.quantity, printer, durationMs }),
      );
    } catch (error) {
      console.warn("PrintQueueService: falha ao notificar o Slack, conclusão mantida.", error);
    }

    return updated;
  }

  // Chamado pela rotina agendada no servidor (ver Requirement "Conclusão
  // automática por tempo esgotado") — conclui, um a um, todo item
  // `imprimindo` cujo expected_finish_at já passou, aplicando exatamente a
  // mesma regra de completePrinting. Uma falha isolada não impede a
  // conclusão dos demais itens vencidos.
  async completeExpiredPrintings(): Promise<PrintQueueItem[]> {
    const now = new Date();
    const printingItems = await this.repositories.printQueueItems.listByStatus(["imprimindo"]);
    const expired = printingItems.filter(
      (item) => item.expectedFinishAt !== null && new Date(item.expectedFinishAt) <= now,
    );

    const completed: PrintQueueItem[] = [];
    for (const item of expired) {
      try {
        completed.push(await this.completePrinting(item.id, null));
      } catch (error) {
        console.warn(`PrintQueueService: falha ao concluir automaticamente o item ${item.id}.`, error);
      }
    }
    return completed;
  }

  async cancel(itemId: string): Promise<PrintQueueItem> {
    const item = await this.repositories.printQueueItems.findById(itemId);
    if (!item) {
      throw new Error("Item da fila não encontrado.");
    }
    if (item.status !== "na_fila" && item.status !== "imprimindo") {
      throw new Error("Apenas itens na fila ou em impressão podem ser cancelados.");
    }

    // Não zera printer_id: histórico é preservado, e a impressora já volta a
    // contar como ociosa assim que o status deixa de ser `imprimindo` (ver
    // listPrinterAvailability).
    return this.repositories.printQueueItems.update(itemId, { status: "cancelado" });
  }
}
