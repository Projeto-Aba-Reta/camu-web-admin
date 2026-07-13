import type { B2bPricingTier } from "@/types/pricing";

export interface CreateB2bPricingTierInput {
  minQuantity: number;
  targetMarginPct: number;
  createdBy: string | null;
}

export interface IB2bPricingTierRepository {
  // Vigente por faixa de min_quantity, mesmo racional de channel_fees.
  findAllCurrent(): Promise<B2bPricingTier[]>;
  findAllHistory(): Promise<B2bPricingTier[]>;
  create(input: CreateB2bPricingTierInput): Promise<B2bPricingTier>;
}
