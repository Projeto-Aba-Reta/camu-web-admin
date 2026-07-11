export type MaterialType = "filamento" | "embalagem";

export type MaterialMovementType = "compra" | "consumo_producao" | "perda_refugo" | "ajuste_manual";

export type ProductMovementType = "producao" | "venda" | "perda" | "ajuste_manual";

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  unit: string;
  referenceCost: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialStockMovement {
  id: string;
  materialId: string;
  quantity: number;
  movementType: MaterialMovementType;
  printerId: string | null;
  productId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface MaterialStockThreshold {
  id: string;
  materialId: string;
  minimumQuantity: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface ProductStockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: ProductMovementType;
  materialStockMovementId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

// Combina saldo derivado + limite configurado (ver Requirement "Insumo sem
// limite configurado nunca é sinalizado"): minimumQuantity null implica
// isLowStock sempre false, independente do balance.
export interface MaterialStockStatus {
  materialId: string;
  balance: number;
  minimumQuantity: number | null;
  isLowStock: boolean;
}
