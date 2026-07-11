import type { MaterialStockThreshold } from "@/types/inventory";

export interface UpsertMaterialStockThresholdInput {
  materialId: string;
  minimumQuantity: number;
  updatedBy: string | null;
}

export interface IMaterialStockThresholdRepository {
  findByMaterialId(materialId: string): Promise<MaterialStockThreshold | null>;
  findAll(): Promise<MaterialStockThreshold[]>;
  // Um insumo sem linha aqui nunca é sinalizado como estoque baixo (ver
  // Requirement "Insumo sem limite configurado nunca é sinalizado") —
  // upsert por material_id (unique), não cria duplicata.
  upsert(input: UpsertMaterialStockThresholdInput): Promise<MaterialStockThreshold>;
}
