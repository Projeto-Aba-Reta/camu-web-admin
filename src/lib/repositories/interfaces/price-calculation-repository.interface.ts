import type { PriceCalculation, PriceCalculationResult } from "@/types/pricing";

export interface CreatePriceCalculationInput extends PriceCalculationResult {
  createdBy: string | null;
}

export interface IPriceCalculationRepository {
  findById(id: string): Promise<PriceCalculation | null>;
  create(input: CreatePriceCalculationInput): Promise<PriceCalculation>;
}
