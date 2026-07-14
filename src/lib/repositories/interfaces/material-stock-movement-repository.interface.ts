import type { MaterialMovementType, MaterialStockMovement } from "@/types/inventory";

export interface CreateMaterialStockMovementInput {
  materialId: string;
  quantity: number;
  movementType: MaterialMovementType;
  printerId?: string | null;
  productId?: string | null;
  notes?: string | null;
  createdBy: string | null;
}

export interface MaterialStockBalance {
  materialId: string;
  balance: number;
}

export interface IMaterialStockMovementRepository {
  findByMaterialId(materialId: string): Promise<MaterialStockMovement[]>;
  create(input: CreateMaterialStockMovementInput): Promise<MaterialStockMovement>;
  // Lê a view material_stock_balances (saldo sempre derivado — ver
  // design.md decisão 1), nunca um campo de saldo armazenado.
  findBalanceByMaterialId(materialId: string): Promise<number>;
  findAllBalances(): Promise<MaterialStockBalance[]>;
  // Guarda de exclusão de peça (ver design.md decisão 2): consumo de insumo
  // atribuído a uma peça. product_id é nullable — movimentações sem peça
  // (compra de filamento, ajuste) não contam.
  countByProductId(productId: string): Promise<number>;
}
