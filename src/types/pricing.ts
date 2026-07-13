export type MarketplaceChannel = "mercado_livre" | "shopee" | "tiktok_shop" | "amazon" | "shein";

export type SizeTier = "P" | "M" | "G";

export interface CostParameters {
  id: string;
  filamentCostPerKg: number;
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
  // Fração (0-1) de margem-alvo B2C aplicada sobre o custo antes da taxa de
  // canal. 0 preserva o preço de equilíbrio anterior a este parâmetro.
  targetMarginPct: number;
  validFrom: string;
  createdBy: string | null;
}

export interface B2bPricingTier {
  id: string;
  minQuantity: number;
  targetMarginPct: number;
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

export interface B2bPrice {
  minQuantity: number;
  suggestedPrice: number;
  margin: number;
}

// Custo de um componente dentro do cálculo agregado de uma peça composta
// (ver Requirement "Custo agregado de peça composta").
export interface CompositeComponentCost {
  componentProductId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

// Porte sugerido: pode ser um único tier (encaixe claro) ou uma ambiguidade
// entre dois tiers candidatos, quando peso e tempo apontam para faixas
// diferentes (ver Requirement "Classificação automática de porte P/M/G").
// null para cálculo de peça composta, que não tem um único peso/tempo a
// classificar.
export type SuggestedTier =
  | { ambiguous: false; tier: SizeTier }
  | { ambiguous: true; candidates: SizeTier[] };

export interface PriceCalculationInput {
  // Omitir weightGrams/printHours quando productId tiver ficha de fatiamento
  // cadastrada para printerId — o motor deriva os dois valores da ficha (ver
  // Requirement "Cálculo a partir de uma ficha de fatiamento cadastrada").
  weightGrams?: number;
  printHours?: number;
  printerId: string;
  productId?: string;
  createdBy: string | null;
}

export interface CalculateCompositePriceInput {
  productId: string;
  createdBy: string | null;
}

export interface PriceCalculationResult {
  weightGrams: number | null;
  printHours: number | null;
  printerId: string | null;
  productId: string | null;
  slicingSheetId: string | null;
  costParametersId: string;
  suggestedTier: SuggestedTier | null;
  totalCost: number;
  costBreakdown: CostBreakdown;
  channelPrices: ChannelPrice[];
  b2bPrices: B2bPrice[];
  componentBreakdown: CompositeComponentCost[] | null;
}

export interface PriceCalculation extends PriceCalculationResult {
  id: string;
  createdBy: string | null;
  createdAt: string;
}
