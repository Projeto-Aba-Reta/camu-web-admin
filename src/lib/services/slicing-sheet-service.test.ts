import { describe, it, expect } from "vitest";
import { SlicingSheetService } from "./slicing-sheet-service";
import type {
  ISlicingSheetRepository,
  UpsertSlicingSheetInput,
} from "@/lib/repositories/interfaces/slicing-sheet-repository.interface";
import type { SlicingSheet } from "@/types/slicing-sheet";

class FakeSlicingSheetRepository implements ISlicingSheetRepository {
  public sheets: SlicingSheet[] = [];
  private counter = 0;

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

  async upsert(input: UpsertSlicingSheetInput): Promise<SlicingSheet> {
    const existing = this.sheets.find(
      (sheet) => sheet.productId === input.productId && sheet.printerId === input.printerId,
    );

    const materials = input.materials.map((material, index) => ({
      id: `${existing?.id ?? `sheet-${this.counter + 1}`}-material-${index}`,
      materialId: material.materialId,
      pieceGrams: material.pieceGrams,
      supportGrams: material.supportGrams,
    }));

    if (existing) {
      existing.printHours = input.printHours;
      existing.materials = materials;
      return existing;
    }

    this.counter += 1;
    const sheet: SlicingSheet = {
      id: `sheet-${this.counter}`,
      productId: input.productId,
      printerId: input.printerId,
      printHours: input.printHours,
      materials,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    this.sheets.push(sheet);
    return sheet;
  }

  async delete(id: string): Promise<void> {
    this.sheets = this.sheets.filter((sheet) => sheet.id !== id);
  }
}

function makeService() {
  const slicingSheets = new FakeSlicingSheetRepository();
  const service = new SlicingSheetService({ slicingSheets });
  return { service, slicingSheets };
}

describe("SlicingSheetService.upsertSheet", () => {
  it("rejeita ficha sem nenhuma linha de material", async () => {
    const { service } = makeService();

    await expect(
      service.upsertSheet({
        productId: "product-1",
        printerId: "printer-1",
        printHours: 3,
        materials: [],
        createdBy: null,
      }),
    ).rejects.toThrow(/pelo menos uma linha de material/);
  });

  it("substitui completamente as linhas de material ao reeditar a mesma peça+impressora", async () => {
    const { service, slicingSheets } = makeService();

    await service.upsertSheet({
      productId: "product-1",
      printerId: "printer-1",
      printHours: 3,
      materials: [{ materialId: "material-branco", pieceGrams: 30, supportGrams: 5 }],
      createdBy: null,
    });

    await service.upsertSheet({
      productId: "product-1",
      printerId: "printer-1",
      printHours: 4,
      materials: [
        { materialId: "material-branco", pieceGrams: 20, supportGrams: 0 },
        { materialId: "material-preto", pieceGrams: 10, supportGrams: 0 },
      ],
      createdBy: null,
    });

    const sheets = await slicingSheets.findByProductId("product-1");
    expect(sheets).toHaveLength(1);
    expect(sheets[0].printHours).toBe(4);
    expect(sheets[0].materials).toHaveLength(2);
  });
});

describe("SlicingSheetService.listByProduct", () => {
  it("calcula o peso da peça como a soma das gramas na peça, excluindo suporte", async () => {
    const { service } = makeService();

    await service.upsertSheet({
      productId: "product-1",
      printerId: "printer-1",
      printHours: 3,
      materials: [
        { materialId: "material-branco", pieceGrams: 30, supportGrams: 5 },
        { materialId: "material-preto", pieceGrams: 10, supportGrams: 0 },
      ],
      createdBy: null,
    });

    const rows = await service.listByProduct("product-1");

    expect(rows).toHaveLength(1);
    expect(rows[0].weightGrams).toBe(40);
  });
});
