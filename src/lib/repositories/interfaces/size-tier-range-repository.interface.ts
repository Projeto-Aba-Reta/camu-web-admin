import type { MarginMode, SizeTier, SizeTierRange } from "@/types/pricing";

export interface CreateSizeTierRangeInput {
  tier: SizeTier;
  minWeightGrams: number;
  maxWeightGrams: number;
  minPrintHours: number;
  maxPrintHours: number;
  // Fração (0-1), não percentual: a conversão acontece no componente.
  b2cMarginPct: number;
  b2cMarginMode: MarginMode;
  b2bMarginPct: number;
  b2bMarginMode: MarginMode;
}

export interface ISizeTierRangeRepository {
  findAllCurrent(): Promise<SizeTierRange[]>;
  // Histórico de todos os tiers juntos, ordenado por tier e por vigência
  // decrescente — usado pela tela de configuração.
  findAllHistory(): Promise<SizeTierRange[]>;
  create(input: CreateSizeTierRangeInput): Promise<SizeTierRange>;
}
