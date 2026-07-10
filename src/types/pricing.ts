export type MarketplaceChannel = "mercado_livre" | "shopee" | "tiktok_shop" | "amazon" | "shein";

export type SizeTier = "P" | "M" | "G";

export interface CostParameters {
  id: string;
  filamentCostPerKg: number;
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
  validFrom: string;
  createdBy: string | null;
}

export interface Printer {
  id: string;
  name: string;
  model: string;
  depreciationPerHour: number;
  isActive: boolean;
  validFrom: string;
  createdBy: string | null;
}

export interface ChannelFee {
  id: string;
  channel: MarketplaceChannel;
  percentageFee: number;
  fixedFee: number;
  validFrom: string;
  createdBy: string | null;
}

export interface SizeTierRange {
  id: string;
  tier: SizeTier;
  minWeightGrams: number;
  maxWeightGrams: number;
  minPrintHours: number;
  maxPrintHours: number;
  validFrom: string;
}

export interface CostBreakdown {
  filamentCost: number;
  energyCost: number;
  depreciationCost: number;
  failureReserveCost: number;
  packagingCost: number;
}

export interface ChannelPrice {
  channel: MarketplaceChannel;
  suggestedPrice: number;
  margin: number;
}

// Porte sugerido: pode ser um único tier (encaixe claro) ou uma ambiguidade
// entre dois tiers candidatos, quando peso e tempo apontam para faixas
// diferentes (ver Requirement "Classificação automática de porte P/M/G").
export type SuggestedTier =
  | { ambiguous: false; tier: SizeTier }
  | { ambiguous: true; candidates: SizeTier[] };

export interface PriceCalculationInput {
  weightGrams: number;
  printHours: number;
  printerId: string;
  createdBy: string | null;
}

export interface PriceCalculationResult {
  weightGrams: number;
  printHours: number;
  printerId: string;
  costParametersId: string;
  suggestedTier: SuggestedTier;
  totalCost: number;
  costBreakdown: CostBreakdown;
  channelPrices: ChannelPrice[];
}

export interface PriceCalculation extends PriceCalculationResult {
  id: string;
  createdBy: string | null;
  createdAt: string;
}
