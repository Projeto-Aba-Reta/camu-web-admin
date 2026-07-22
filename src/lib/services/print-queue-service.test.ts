import { describe, it, expect } from "vitest";
import { InventoryService } from "./inventory-service";
import { PrintQueueService } from "./print-queue-service";
import type { ISlackNotificationService } from "./slack-notification-service";
import type {
  CreatePrintQueueItemInput,
  CreatePrintQueueItemMaterialInput,
  IPrintQueueRepository,
  UpdatePrintQueueItemInput,
} from "@/lib/repositories/interfaces/print-queue-repository.interface";
import type { CreatePrinterInput, IPrinterRepository } from "@/lib/repositories/interfaces/printer-repository.interface";
import type {
  CreateProductInput,
  IProductRepository,
  UpdateProductInput,
} from "@/lib/repositories/interfaces/product-repository.interface";
import type {
  ISlicingSheetRepository,
  UpsertSlicingSheetInput,
} from "@/lib/repositories/interfaces/slicing-sheet-repository.interface";
import type {
  CreateMaterialStockMovementInput,
  IMaterialStockMovementRepository,
  MaterialStockBalance,
} from "@/lib/repositories/interfaces/material-stock-movement-repository.interface";
import type {
  IMaterialStockThresholdRepository,
  UpsertMaterialStockThresholdInput,
} from "@/lib/repositories/interfaces/material-stock-threshold-repository.interface";
import type {
  CreateProductStockMovementInput,
  IProductStockMovementRepository,
  ProductStockBalance,
} from "@/lib/repositories/interfaces/product-stock-movement-repository.interface";
import type { IMaterialRepository } from "@/lib/repositories/interfaces/material-repository.interface";
import type { Material, MaterialStockMovement, MaterialStockThreshold, ProductStockMovement } from "@/types/inventory";
import type { Product } from "@/types/catalog";
import type { Printer } from "@/types/pricing";
import type { PrintQueueItem, PrintQueueItemMaterial, PrintQueueStatus } from "@/types/print-queue";
import type { SlicingSheet } from "@/types/slicing-sheet";

// Fakes seguem o mesmo padrão de inventory-service.test.ts: implementam a
// interface do repositório real, mantendo estado em memória.

class FakePrintQueueRepository implements IPrintQueueRepository {
  public items: PrintQueueItem[] = [];
  public materialsByItemId = new Map<string, PrintQueueItemMaterial[]>();
  private counter = 0;
  private materialCounter = 0;

  async findById(id: string): Promise<PrintQueueItem | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async listByStatus(statuses?: PrintQueueStatus[]): Promise<PrintQueueItem[]> {
    if (!statuses || statuses.length === 0) return this.items;
    return this.items.filter((item) => statuses.includes(item.status));
  }

  async create(input: CreatePrintQueueItemInput): Promise<PrintQueueItem> {
    this.counter += 1;
    const item: PrintQueueItem = {
      id: `item-${this.counter}`,
      productId: input.productId,
      quantity: input.quantity,
      status: "na_fila",
      printerId: null,
      startedAt: null,
      finishedAt: null,
      expectedFinishAt: null,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.items.push(item);
    return item;
  }

  async update(id: string, input: UpdatePrintQueueItemInput): Promise<PrintQueueItem> {
    const item = this.items.find((existing) => existing.id === id);
    if (!item) throw new Error("Item da fila não encontrado.");
    if (input.status !== undefined) item.status = input.status;
    if (input.printerId !== undefined) item.printerId = input.printerId;
    if (input.startedAt !== undefined) item.startedAt = input.startedAt;
    if (input.finishedAt !== undefined) item.finishedAt = input.finishedAt;
    if (input.expectedFinishAt !== undefined) item.expectedFinishAt = input.expectedFinishAt;
    return item;
  }

  async setItemMaterials(
    itemId: string,
    materials: CreatePrintQueueItemMaterialInput[],
  ): Promise<PrintQueueItemMaterial[]> {
    const lines = materials.map((material) => {
      this.materialCounter += 1;
      return {
        id: `item-material-${this.materialCounter}`,
        printQueueItemId: itemId,
        materialId: material.materialId,
        pieceGrams: material.pieceGrams,
        supportGrams: material.supportGrams,
      };
    });
    this.materialsByItemId.set(itemId, lines);
    return lines;
  }

  async findMaterialsByItemId(itemId: string): Promise<PrintQueueItemMaterial[]> {
    return this.materialsByItemId.get(itemId) ?? [];
  }

  async countByProductId(productId: string): Promise<number> {
    return this.items.filter((item) => item.productId === productId).length;
  }
}

class FakePrinterRepository implements IPrinterRepository {
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
  async create(_input: CreatePrinterInput): Promise<Printer> {
    throw new Error("not implemented in fake");
  }
  async setActive(_id: string, _isActive: boolean): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

class FakeProductRepository implements IProductRepository {
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
  async create(_input: CreateProductInput): Promise<Product> {
    throw new Error("not implemented in fake");
  }
  async update(_id: string, _input: UpdateProductInput): Promise<Product> {
    throw new Error("not implemented in fake");
  }
  async delete(_id: string): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

class FakeSlicingSheetRepository implements ISlicingSheetRepository {
  public sheets: SlicingSheet[] = [];

  async findAll(): Promise<SlicingSheet[]> {
    return this.sheets;
  }

  async findByProductId(productId: string): Promise<SlicingSheet[]> {
    return this.sheets.filter((sheet) => sheet.productId === productId);
  }
  async findByProductAndPrinter(productId: string, printerId: string): Promise<SlicingSheet | null> {
    return (
      this.sheets.find((sheet) => sheet.productId === productId && sheet.printerId === printerId) ?? null
    );
  }
  async upsert(_input: UpsertSlicingSheetInput): Promise<SlicingSheet> {
    throw new Error("not implemented in fake");
  }
  async delete(_id: string): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

class FakeMaterialStockMovementRepository implements IMaterialStockMovementRepository {
  public movements: MaterialStockMovement[] = [];

  async findByMaterialId(materialId: string): Promise<MaterialStockMovement[]> {
    return this.movements.filter((m) => m.materialId === materialId);
  }
  async create(input: CreateMaterialStockMovementInput): Promise<MaterialStockMovement> {
    const movement: MaterialStockMovement = {
      id: `material-movement-${this.movements.length + 1}`,
      materialId: input.materialId,
      quantity: input.quantity,
      movementType: input.movementType,
      printerId: input.printerId ?? null,
      productId: input.productId ?? null,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.movements.push(movement);
    return movement;
  }
  async findBalanceByMaterialId(materialId: string): Promise<number> {
    return this.movements.filter((m) => m.materialId === materialId).reduce((sum, m) => sum + m.quantity, 0);
  }
  async findAllBalances(): Promise<MaterialStockBalance[]> {
    return [];
  }
  async countByProductId(productId: string): Promise<number> {
    return this.movements.filter((m) => m.productId === productId).length;
  }
}

class FakeMaterialStockThresholdRepository implements IMaterialStockThresholdRepository {
  async findByMaterialId(): Promise<MaterialStockThreshold | null> {
    return null;
  }
  async findAll(): Promise<MaterialStockThreshold[]> {
    return [];
  }
  async upsert(_input: UpsertMaterialStockThresholdInput): Promise<MaterialStockThreshold> {
    throw new Error("not implemented in fake");
  }
}

class FakeProductStockMovementRepository implements IProductStockMovementRepository {
  public movements: ProductStockMovement[] = [];

  async findByProductId(productId: string): Promise<ProductStockMovement[]> {
    return this.movements.filter((m) => m.productId === productId);
  }
  async create(input: CreateProductStockMovementInput): Promise<ProductStockMovement> {
    const movement: ProductStockMovement = {
      id: `product-movement-${this.movements.length + 1}`,
      productId: input.productId,
      quantity: input.quantity,
      movementType: input.movementType,
      materialStockMovementId: input.materialStockMovementId ?? null,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.movements.push(movement);
    return movement;
  }
  async findBalanceByProductId(productId: string): Promise<number> {
    return this.movements.filter((m) => m.productId === productId).reduce((sum, m) => sum + m.quantity, 0);
  }
  async findAllBalances(): Promise<ProductStockBalance[]> {
    return [];
  }
  async countByProductId(productId: string): Promise<number> {
    return this.movements.filter((m) => m.productId === productId).length;
  }
}

class FakeMaterialRepository implements IMaterialRepository {
  async findById(): Promise<Material | null> {
    return null;
  }
  async findAll(): Promise<Material[]> {
    return [];
  }
  async create(): Promise<Material> {
    throw new Error("not implemented in fake");
  }
  async update(): Promise<Material> {
    throw new Error("not implemented in fake");
  }
}

class FakeSlackNotificationService implements ISlackNotificationService {
  public messages: string[] = [];
  async sendMessage(text: string): Promise<void> {
    this.messages.push(text);
  }
}

class FailingSlackNotificationService implements ISlackNotificationService {
  async sendMessage(): Promise<void> {
    throw new Error("Slack indisponível.");
  }
}

const PRINTER: Printer = {
  id: "printer-1",
  name: "Ender-3 V3 SE",
  model: "Ender-3 V3 SE",
  depreciationPerHour: 1,
  isActive: true,
  validFrom: "2026-01-01T00:00:00.000Z",
  createdBy: null,
};

const OTHER_PRINTER: Printer = {
  id: "printer-2",
  name: "Bambu Lab A1 Combo",
  model: "Bambu Lab A1 Combo",
  depreciationPerHour: 2,
  isActive: true,
  validFrom: "2026-01-01T00:00:00.000Z",
  createdBy: null,
};

const PRODUCT: Product = {
  id: "product-1",
  name: "Miniatura Leon",
  slug: "miniatura-leon",
  description: null,
  category: "miniatura_colecionavel",
  sizeTier: "M",
  status: "ativo",
  productType: "simples",
  productionLeadDaysMin: null,
  productionLeadDaysMax: null,
  priceCalculationId: null,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SHEET: SlicingSheet = {
  id: "sheet-1",
  productId: PRODUCT.id,
  printerId: PRINTER.id,
  printHours: 3,
  materials: [
    { id: "line-1", materialId: "material-branco", pieceGrams: 30, supportGrams: 5 },
    { id: "line-2", materialId: "material-preto", pieceGrams: 10, supportGrams: 0 },
  ],
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeService(slack: ISlackNotificationService = new FakeSlackNotificationService()) {
  const printQueueItems = new FakePrintQueueRepository();
  const printers = new FakePrinterRepository();
  const products = new FakeProductRepository();
  const slicingSheets = new FakeSlicingSheetRepository();

  printers.printers.push(PRINTER, OTHER_PRINTER);
  products.products.push(PRODUCT);
  slicingSheets.sheets.push(SHEET);

  const materials = new FakeMaterialRepository();
  const materialStockMovements = new FakeMaterialStockMovementRepository();
  const materialStockThresholds = new FakeMaterialStockThresholdRepository();
  const productStockMovements = new FakeProductStockMovementRepository();

  const inventoryService = new InventoryService({
    materials,
    materialStockMovements,
    materialStockThresholds,
    productStockMovements,
  });

  const service = new PrintQueueService({ printQueueItems, printers, products, slicingSheets }, inventoryService, slack);

  return {
    service,
    printQueueItems,
    printers,
    products,
    slicingSheets,
    materialStockMovements,
    productStockMovements,
    slack,
  };
}

describe("PrintQueueService.startPrinting", () => {
  it("inicia a impressão quando a impressora está ociosa e tem ficha cadastrada", async () => {
    const { service, printQueueItems } = makeService();
    const item = await printQueueItems.create({ productId: PRODUCT.id, quantity: 2, createdBy: null });

    const updated = await service.startPrinting(item.id, PRINTER.id);

    expect(updated.status).toBe("imprimindo");
    expect(updated.printerId).toBe(PRINTER.id);
    expect(updated.startedAt).not.toBeNull();
    expect(updated.expectedFinishAt).not.toBeNull();

    const materials = await printQueueItems.findMaterialsByItemId(item.id);
    expect(materials).toHaveLength(2);
  });

  it("calcula expected_finish_at a partir do tempo de impressão da ficha", async () => {
    const { service, printQueueItems } = makeService();
    const item = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });

    const updated = await service.startPrinting(item.id, PRINTER.id);

    const startedAtMs = new Date(updated.startedAt as string).getTime();
    const expectedFinishAtMs = new Date(updated.expectedFinishAt as string).getTime();
    expect(expectedFinishAtMs - startedAtMs).toBe(SHEET.printHours * 60 * 60 * 1000);
  });

  it("rejeita iniciar em uma impressora sem ficha de fatiamento cadastrada para o produto", async () => {
    const { service, printQueueItems } = makeService();
    const item = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });

    await expect(service.startPrinting(item.id, OTHER_PRINTER.id)).rejects.toThrow(/ficha de fatiamento/);
  });

  it("rejeita iniciar em uma impressora que já está imprimindo outro item", async () => {
    const { service, printQueueItems } = makeService();
    const first = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });
    const second = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });

    await service.startPrinting(first.id, PRINTER.id);

    await expect(service.startPrinting(second.id, PRINTER.id)).rejects.toThrow(/já está imprimindo/);
  });
});

describe("PrintQueueService.completePrinting", () => {
  it("gera uma movimentação de peça pronta e uma de consumo por material da ficha", async () => {
    const { service, printQueueItems, materialStockMovements, productStockMovements } = makeService();
    const item = await printQueueItems.create({ productId: PRODUCT.id, quantity: 2, createdBy: null });
    await service.startPrinting(item.id, PRINTER.id);

    const completed = await service.completePrinting(item.id, "user-1");

    expect(completed.status).toBe("concluido");
    expect(completed.finishedAt).not.toBeNull();

    const brancoMovements = await materialStockMovements.findByMaterialId("material-branco");
    expect(brancoMovements).toHaveLength(1);
    expect(brancoMovements[0].movementType).toBe("consumo_producao");
    expect(brancoMovements[0].quantity).toBe(-((30 + 5) * item.quantity));

    const pretoMovements = await materialStockMovements.findByMaterialId("material-preto");
    expect(pretoMovements).toHaveLength(1);
    expect(pretoMovements[0].quantity).toBe(-(10 * item.quantity));

    const productMovements = await productStockMovements.findByProductId(PRODUCT.id);
    expect(productMovements).toHaveLength(1);
    expect(productMovements[0].movementType).toBe("producao");
    expect(productMovements[0].quantity).toBe(item.quantity);
  });

  it("não bloqueia a conclusão quando o envio ao Slack falha", async () => {
    const { service, printQueueItems, productStockMovements } = makeService(new FailingSlackNotificationService());
    const item = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });
    await service.startPrinting(item.id, PRINTER.id);

    const completed = await service.completePrinting(item.id, null);

    expect(completed.status).toBe("concluido");
    expect(await productStockMovements.findByProductId(PRODUCT.id)).toHaveLength(1);
  });

  it("envia uma notificação ao Slack quando a conclusão é bem-sucedida", async () => {
    const { service, printQueueItems, slack } = makeService();
    const item = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });
    await service.startPrinting(item.id, PRINTER.id);

    await service.completePrinting(item.id, null);

    expect((slack as FakeSlackNotificationService).messages).toHaveLength(1);
  });
});

describe("PrintQueueService.completeExpiredPrintings", () => {
  it("conclui apenas itens imprimindo cujo expected_finish_at já passou", async () => {
    const { service, printQueueItems, slicingSheets, productStockMovements } = makeService();
    slicingSheets.sheets.push({ ...SHEET, id: "sheet-2", printerId: OTHER_PRINTER.id });
    const expiredItem = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });
    const withinTimeItem = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });

    await service.startPrinting(expiredItem.id, PRINTER.id);
    await printQueueItems.update(expiredItem.id, {
      expectedFinishAt: new Date(Date.now() - 60_000).toISOString(),
    });

    await service.startPrinting(withinTimeItem.id, OTHER_PRINTER.id);
    await printQueueItems.update(withinTimeItem.id, {
      expectedFinishAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    });

    const completed = await service.completeExpiredPrintings();

    expect(completed.map((item) => item.id)).toEqual([expiredItem.id]);

    const refreshedExpired = await printQueueItems.findById(expiredItem.id);
    const refreshedWithinTime = await printQueueItems.findById(withinTimeItem.id);
    expect(refreshedExpired?.status).toBe("concluido");
    expect(refreshedWithinTime?.status).toBe("imprimindo");

    expect(await productStockMovements.findByProductId(PRODUCT.id)).toHaveLength(1);
  });
});

describe("PrintQueueService.cancel", () => {
  it("cancela um item sem gerar nenhuma movimentação de estoque", async () => {
    const { service, printQueueItems, materialStockMovements, productStockMovements } = makeService();
    const item = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });
    await service.startPrinting(item.id, PRINTER.id);

    const cancelled = await service.cancel(item.id);

    expect(cancelled.status).toBe("cancelado");
    expect(await materialStockMovements.findByMaterialId("material-branco")).toHaveLength(0);
    expect(await productStockMovements.findByProductId(PRODUCT.id)).toHaveLength(0);
  });

  it("libera a impressora para uma nova impressão após o cancelamento", async () => {
    const { service, printQueueItems } = makeService();
    const first = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });
    const second = await printQueueItems.create({ productId: PRODUCT.id, quantity: 1, createdBy: null });

    await service.startPrinting(first.id, PRINTER.id);
    await service.cancel(first.id);

    const updated = await service.startPrinting(second.id, PRINTER.id);
    expect(updated.status).toBe("imprimindo");
  });
});

describe("PrintQueueService.addToQueue", () => {
  it("adiciona um item na_fila quando o produto tem ficha de fatiamento cadastrada", async () => {
    const { service } = makeService();

    const item = await service.addToQueue({ productId: PRODUCT.id, quantity: 2, createdBy: null });

    expect(item.status).toBe("na_fila");
    expect(item.productId).toBe(PRODUCT.id);
    expect(item.quantity).toBe(2);
  });

  it("rejeita produto sem nenhuma ficha de fatiamento cadastrada", async () => {
    const { service, products } = makeService();
    products.products.push({ ...PRODUCT, id: "product-sem-ficha" });

    await expect(
      service.addToQueue({ productId: "product-sem-ficha", quantity: 1, createdBy: null }),
    ).rejects.toThrow(/ficha de fatiamento/);
  });
});
