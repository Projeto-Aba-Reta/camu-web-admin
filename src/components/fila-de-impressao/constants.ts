import type { PrintQueueStatus } from "@/types/print-queue";

export const PRINT_QUEUE_STATUS_LABEL: Record<PrintQueueStatus, string> = {
  na_fila: "Na fila",
  imprimindo: "Imprimindo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
