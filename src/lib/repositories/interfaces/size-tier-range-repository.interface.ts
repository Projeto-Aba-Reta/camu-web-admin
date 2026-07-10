import type { SizeTier, SizeTierRange } from "@/types/pricing";

export interface CreateSizeTierRangeInput {
  tier: SizeTier;
  minWeightGrams: number;
  maxWeightGrams: number;
  minPrintHours: number;
  maxPrintHours: number;
}

export interface ISizeTierRangeRepository {
  findAllCurrent(): Promise<SizeTierRange[]>;
  create(input: CreateSizeTierRangeInput): Promise<SizeTierRange>;
}
