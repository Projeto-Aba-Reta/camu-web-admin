import type { Repositories } from "@/lib/repositories";
import type {
  ChannelPrice,
  CostBreakdown,
  PriceCalculation,
  PriceCalculationInput,
  PriceCalculationResult,
  SizeTier,
  SizeTierRange,
  SuggestedTier,
} from "@/types/pricing";

const TIER_ORDER: SizeTier[] = ["P", "M", "G"];

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Classifica o porte comparando peso e tempo contra as faixas vigentes.
// Se um único tier casa com peso E tempo simultaneamente, a classificação é
// direta. Caso contrário, junta os candidatos que casam por peso e por
// tempo separadamente: se sobrar exatamente um, ainda é uma classificação
// confiável (só um dos dois sinais bateu numa faixa); se sobrar mais de um,
// sinaliza ambiguidade sem escolher automaticamente (ver Requirement
// "Classificação automática de porte P/M/G").
export function classifyTier(
  weightGrams: number,
  printHours: number,
  ranges: SizeTierRange[],
): SuggestedTier {
  const weightMatches = ranges.filter((r) => inRange(weightGrams, r.minWeightGrams, r.maxWeightGrams));
  const timeMatches = ranges.filter((r) => inRange(printHours, r.minPrintHours, r.maxPrintHours));

  const weightTiers = new Set(weightMatches.map((r) => r.tier));
  const timeTiers = new Set(timeMatches.map((r) => r.tier));

  const both = TIER_ORDER.filter((tier) => weightTiers.has(tier) && timeTiers.has(tier));
  if (both.length === 1) return { ambiguous: false, tier: both[0] };

  const union = TIER_ORDER.filter((tier) => weightTiers.has(tier) || timeTiers.has(tier));
  if (union.length === 1) return { ambiguous: false, tier: union[0] };
  if (union.length === 0) {
    throw new Error(
      "Não há faixa de porte (P/M/G) vigente que se aplique a este peso/tempo — cadastre faixas de referência antes de calcular.",
    );
  }
  return { ambiguous: true, candidates: union };
}

function calculateCostBreakdown(
  weightGrams: number,
  printHours: number,
  depreciationPerHour: number,
  costParameters: {
    filamentCostPerKg: number;
    energyCostPerKwh: number;
    averagePowerWatts: number;
    failureReservePct: number;
    packagingCost: number;
  },
): CostBreakdown {
  const filamentCost = (weightGrams / 1000) * costParameters.filamentCostPerKg;
  const energyCost = printHours * (costParameters.averagePowerWatts / 1000) * costParameters.energyCostPerKwh;
  const depreciationCost = printHours * depreciationPerHour;
  const subtotal = filamentCost + energyCost + depreciationCost;
  const failureReserveCost = subtotal * costParameters.failureReservePct;
  const packagingCost = costParameters.packagingCost;

  return { filamentCost, energyCost, depreciationCost, failureReserveCost, packagingCost };
}

function sumCostBreakdown(breakdown: CostBreakdown): number {
  return (
    breakdown.filamentCost +
    breakdown.energyCost +
    breakdown.depreciationCost +
    breakdown.failureReserveCost +
    breakdown.packagingCost
  );
}

// Preço sugerido por canal: custo ÷ (1 - percentual da taxa) + taxa fixa
// (ver design.md, decisão 3). É um preço de equilíbrio (cobre custo + taxas
// do canal), não um preço com margem de lucro embutida — não há parâmetro
// de margem-alvo neste schema; ajuste de margem fica para quem revisar o
// preço sugerido na UI de precificação.
function calculateChannelPrice(
  totalCost: number,
  percentageFee: number,
  fixedFee: number,
): { suggestedPrice: number; margin: number } {
  const suggestedPrice = totalCost / (1 - percentageFee) + fixedFee;
  const netRevenue = suggestedPrice * (1 - percentageFee) - fixedFee;
  const margin = netRevenue - totalCost;
  return { suggestedPrice, margin };
}

type PricingRepositories = Pick<
  Repositories,
  "costParameters" | "printers" | "channelFees" | "sizeTierRanges" | "priceCalculations"
>;

export class PricingService {
  constructor(private readonly repositories: PricingRepositories) {}

  async calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    const [costParameters, printer, channelFees, sizeTierRanges] = await Promise.all([
      this.repositories.costParameters.findCurrent(),
      this.repositories.printers.findById(input.printerId),
      this.repositories.channelFees.findAllCurrent(),
      this.repositories.sizeTierRanges.findAllCurrent(),
    ]);

    if (!costParameters) {
      throw new Error("Nenhum parâmetro de custo vigente cadastrado.");
    }
    if (!printer) {
      throw new Error(`Impressora ${input.printerId} não encontrada.`);
    }

    const costBreakdown = calculateCostBreakdown(
      input.weightGrams,
      input.printHours,
      printer.depreciationPerHour,
      costParameters,
    );
    const totalCost = sumCostBreakdown(costBreakdown);

    const suggestedTier = classifyTier(input.weightGrams, input.printHours, sizeTierRanges);

    const channelPrices: ChannelPrice[] = channelFees.map((fee) => ({
      channel: fee.channel,
      ...calculateChannelPrice(totalCost, fee.percentageFee, fee.fixedFee),
    }));

    return {
      weightGrams: input.weightGrams,
      printHours: input.printHours,
      printerId: input.printerId,
      costParametersId: costParameters.id,
      suggestedTier,
      totalCost,
      costBreakdown,
      channelPrices,
    };
  }

  async calculateAndSavePrice(input: PriceCalculationInput): Promise<PriceCalculation> {
    const result = await this.calculatePrice(input);
    return this.repositories.priceCalculations.create({ ...result, createdBy: input.createdBy });
  }
}
