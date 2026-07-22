import type { PiecePart } from "@/types/catalog";

export interface CreatePiecePartInput {
  productId: string;
  name: string;
  quantity: number;
  materialId: string | null;
  pieceGrams: number;
  supportGrams: number;
  printerId: string;
  printHours: number;
  position?: number;
  createdBy: string | null;
}

export interface UpdatePiecePartInput {
  name?: string;
  quantity?: number;
  materialId?: string | null;
  pieceGrams?: number;
  supportGrams?: number;
  printerId?: string;
  printHours?: number;
  position?: number;
}

export interface IProductPartRepository {
  // Ordenadas por `position` para a UI de cadastro e para o breakdown do
  // cálculo aparecerem sempre na mesma ordem.
  findByProductId(productId: string): Promise<PiecePart[]>;
  create(input: CreatePiecePartInput): Promise<PiecePart>;
  update(id: string, input: UpdatePiecePartInput): Promise<PiecePart>;
  remove(id: string): Promise<void>;
}
