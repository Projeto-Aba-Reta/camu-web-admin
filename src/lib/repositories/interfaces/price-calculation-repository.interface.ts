import type { PriceCalculation, PriceCalculationResult } from "@/types/pricing";

export interface CreatePriceCalculationInput extends PriceCalculationResult {
  createdBy: string | null;
}

export interface IPriceCalculationRepository {
  findById(id: string): Promise<PriceCalculation | null>;
  // Mais recentes primeiro; usada pela tela de histórico (filtros de período
  // e porte são aplicados sobre este resultado, não recalculados).
  findRecent(limit?: number): Promise<PriceCalculation[]>;
  create(input: CreatePriceCalculationInput): Promise<PriceCalculation>;
}
