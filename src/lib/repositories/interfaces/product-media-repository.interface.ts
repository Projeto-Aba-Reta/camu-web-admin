import type { ProductMedia } from "@/types/catalog";

export interface CreateProductMediaInput {
  productId: string;
  storagePath: string;
  displayOrder: number;
}

export interface IProductMediaRepository {
  findById(id: string): Promise<ProductMedia | null>;
  // Ordenados por display_order (ver Requirement "Múltiplas fotos vinculadas a uma peça").
  findByProductId(productId: string): Promise<ProductMedia[]>;
  create(input: CreateProductMediaInput): Promise<ProductMedia>;
  updateDisplayOrder(id: string, displayOrder: number): Promise<void>;
  // Desmarca qualquer capa existente da peça e marca `id` como capa, nessa
  // ordem — garante no máximo uma capa mesmo com o índice único parcial da
  // migration (ver design.md decisão 3).
  setCover(id: string, productId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
