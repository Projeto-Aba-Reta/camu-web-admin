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
  // Histórico de todos os tiers juntos, ordenado por tier e por vigência
  // decrescente — usado pela tela de configuração.
  findAllHistory(): Promise<SizeTierRange[]>;
  create(input: CreateSizeTierRangeInput): Promise<SizeTierRange>;
}
