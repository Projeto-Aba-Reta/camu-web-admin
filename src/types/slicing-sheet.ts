export interface SlicingSheetMaterialLine {
  id: string;
  materialId: string;
  pieceGrams: number;
  supportGrams: number;
}

export interface SlicingSheet {
  id: string;
  productId: string;
  printerId: string;
  printHours: number;
  materials: SlicingSheetMaterialLine[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}
