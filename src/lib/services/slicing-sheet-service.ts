import type { Repositories } from "@/lib/repositories";
import type { UpsertSlicingSheetInput } from "@/lib/repositories/interfaces/slicing-sheet-repository.interface";
import type { SlicingSheet } from "@/types/slicing-sheet";

export interface SlicingSheetWithWeight {
  sheet: SlicingSheet;
  // Soma das gramas usadas na peça (excluindo suporte) de todas as linhas
  // — ver Requirement "Peso da peça derivado da ficha".
  weightGrams: number;
}

type SlicingSheetRepositories = Pick<Repositories, "slicingSheets">;

function withWeight(sheet: SlicingSheet): SlicingSheetWithWeight {
  const weightGrams = sheet.materials.reduce((sum, material) => sum + material.pieceGrams, 0);
  return { sheet, weightGrams };
}

export class SlicingSheetService {
  constructor(private readonly repositories: SlicingSheetRepositories) {}

  // Uma ficha sem nenhuma linha de material não tem peso nem consumo de
  // insumo — não faz sentido existir (ver Requirement "Cadastro de ficha de
  // fatiamento por peça e impressora").
  async upsertSheet(input: UpsertSlicingSheetInput): Promise<SlicingSheet> {
    if (input.materials.length === 0) {
      throw new Error("A ficha de fatiamento precisa de pelo menos uma linha de material.");
    }
    return this.repositories.slicingSheets.upsert(input);
  }

  async listByProduct(productId: string): Promise<SlicingSheetWithWeight[]> {
    const sheets = await this.repositories.slicingSheets.findByProductId(productId);
    return sheets.map(withWeight);
  }
}
