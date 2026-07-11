import type { ProductMovementType, ProductStockMovement } from "@/types/inventory";

export interface CreateProductStockMovementInput {
  productId: string;
  quantity: number;
  movementType: ProductMovementType;
  materialStockMovementId?: string | null;
  notes?: string | null;
  createdBy: string | null;
}

export interface ProductStockBalance {
  productId: string;
  balance: number;
}

export interface IProductStockMovementRepository {
  findByProductId(productId: string): Promise<ProductStockMovement[]>;
  create(input: CreateProductStockMovementInput): Promise<ProductStockMovement>;
  findBalanceByProductId(productId: string): Promise<number>;
  findAllBalances(): Promise<ProductStockBalance[]>;
}
