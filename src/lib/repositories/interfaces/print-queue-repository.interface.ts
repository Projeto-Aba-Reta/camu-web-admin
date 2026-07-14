import type { PrintQueueItem, PrintQueueItemMaterial, PrintQueueStatus } from "@/types/print-queue";

export interface CreatePrintQueueItemInput {
  productId: string;
  quantity: number;
  createdBy: string | null;
}

export interface UpdatePrintQueueItemInput {
  status?: PrintQueueStatus;
  printerId?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  expectedFinishAt?: string | null;
}

export interface CreatePrintQueueItemMaterialInput {
  materialId: string;
  pieceGrams: number;
  supportGrams: number;
}

export interface IPrintQueueRepository {
  findById(id: string): Promise<PrintQueueItem | null>;
  // Sem argumento retorna todos os itens (usado pela tela para agrupar por
  // status); com argumento filtra pelos status informados (ex.: usado pelo
  // service para checar exclusividade de impressora entre itens
  // `imprimindo`, e pela rotina de conclusão automática).
  listByStatus(statuses?: PrintQueueStatus[]): Promise<PrintQueueItem[]>;
  create(input: CreatePrintQueueItemInput): Promise<PrintQueueItem>;
  update(id: string, input: UpdatePrintQueueItemInput): Promise<PrintQueueItem>;
  // Snapshot das linhas da ficha de fatiamento, copiado no início da
  // impressão ("play") — ver Requirement "Início bem-sucedido copia a
  // ficha para o item".
  setItemMaterials(itemId: string, materials: CreatePrintQueueItemMaterialInput[]): Promise<PrintQueueItemMaterial[]>;
  findMaterialsByItemId(itemId: string): Promise<PrintQueueItemMaterial[]>;
  // Guarda de exclusão de peça: print_queue_items.product_id referencia
  // products sem `on delete`, então a FK bloqueia a remoção. Contamos para
  // explicar o bloqueio antes de tentar (ver design.md decisão 2).
  countByProductId(productId: string): Promise<number>;
}
