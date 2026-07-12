export type PrintQueueStatus = "na_fila" | "imprimindo" | "concluido" | "cancelado";

export interface PrintQueueItem {
  id: string;
  productId: string;
  quantity: number;
  status: PrintQueueStatus;
  printerId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  // started_at + tempo de impressão da ficha de fatiamento usada no início
  // ("play"). Alimenta o cronômetro no cliente e a conclusão automática por
  // tempo esgotado (ver Requirement "Conclusão automática por tempo
  // esgotado").
  expectedFinishAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

// Snapshot das linhas de product_slicing_sheet_materials copiado no início
// da impressão — ver design.md decisão "Ficha é snapshotada no item da
// fila no momento do play".
export interface PrintQueueItemMaterial {
  id: string;
  printQueueItemId: string;
  materialId: string;
  pieceGrams: number;
  supportGrams: number;
}
