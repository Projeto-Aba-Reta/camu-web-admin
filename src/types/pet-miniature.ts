// Vocabulário espelha o check constraint de pet_miniature_requests (migration
// 20260825120000_pet-miniature-schema.sql) — qualquer mudança lá precisa
// refletir aqui.
export const PET_MINIATURE_STATUSES = ["processando", "pronto", "falhou"] as const;
export type PetMiniatureStatus = (typeof PET_MINIATURE_STATUSES)[number];

export const PET_MINIATURE_VARIANTS = ["sem_pintura", "com_pintura"] as const;
export type PetMiniatureVariant = (typeof PET_MINIATURE_VARIANTS)[number];

// Encomenda de miniatura de pet vinda do site (fotos → prévia por IA →
// aprovação → pedido). order_id fica nulo até o cliente aprovar e pagar — ver
// comentário da tabela na migration.
export interface PetMiniatureRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  photoPaths: string[];
  status: PetMiniatureStatus;
  generatedImagePaintedPath: string | null;
  generatedImagePlainPath: string | null;
  selectedVariant: PetMiniatureVariant | null;
  aiError: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}
