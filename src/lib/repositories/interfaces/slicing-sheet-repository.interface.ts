import type { SlicingSheet } from "@/types/slicing-sheet";

export interface SlicingSheetMaterialInput {
  materialId: string;
  pieceGrams: number;
  supportGrams: number;
}

export interface UpsertSlicingSheetInput {
  productId: string;
  printerId: string;
  printHours: number;
  materials: SlicingSheetMaterialInput[];
  createdBy: string | null;
}

export interface ISlicingSheetRepository {
  findAll(): Promise<SlicingSheet[]>;
  findByProductId(productId: string): Promise<SlicingSheet[]>;
  findByProductAndPrinter(productId: string, printerId: string): Promise<SlicingSheet | null>;
  // Substitui a ficha existente para (productId, printerId) por completo
  // (cabeçalho + todas as linhas de material), ou cria uma nova se não
  // houver ficha para essa combinação ainda — ver Requirement "Uma ficha
  // por combinação peça+impressora".
  upsert(input: UpsertSlicingSheetInput): Promise<SlicingSheet>;
  delete(id: string): Promise<void>;
}
