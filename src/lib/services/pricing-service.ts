import type { Repositories } from "@/lib/repositories";
import type {
  B2bPrice,
  B2bPricingTier,
  CalculateCompositePriceInput,
  ChannelPrice,
  CompositeComponentCost,
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

function addWeightedBreakdown(target: CostBreakdown, addend: CostBreakdown, weight: number): void {
  target.filamentCost += addend.filamentCost * weight;
  target.energyCost += addend.energyCost * weight;
  target.depreciationCost += addend.depreciationCost * weight;
  target.failureReserveCost += addend.failureReserveCost * weight;
  target.packagingCost += addend.packagingCost * weight;
}

// Preço sugerido por canal: (custo × (1 + margem-alvo)) ÷ (1 - percentual da
// taxa) + taxa fixa (ver design.md, decisão 4). Com margem-alvo 0 (default),
// é exatamente o preço de equilíbrio original — cobre custo + taxas do
// canal, sem margem embutida.
function calculateChannelPrice(
  totalCost: number,
  targetMarginPct: number,
  percentageFee: number,
  fixedFee: number,
): { suggestedPrice: number; margin: number } {
  const costWithMargin = totalCost * (1 + targetMarginPct);
  const suggestedPrice = costWithMargin / (1 - percentageFee) + fixedFee;
  const netRevenue = suggestedPrice * (1 - percentageFee) - fixedFee;
  const margin = netRevenue - totalCost;
  return { suggestedPrice, margin };
}

// Preço B2B por faixa de volume: custo × (1 + margem-alvo da faixa), sem
// taxa de canal (ver design.md, decisão 5 — não há intermediário de
// marketplace na venda B2B).
function calculateB2bPrice(totalCost: number, tier: B2bPricingTier): B2bPrice {
  const suggestedPrice = totalCost * (1 + tier.targetMarginPct);
  return { minQuantity: tier.minQuantity, suggestedPrice, margin: suggestedPrice - totalCost };
}

type PricingRepositories = Pick<
  Repositories,
  | "costParameters"
  | "printers"
  | "channelFees"
  | "sizeTierRanges"
  | "priceCalculations"
  | "slicingSheets"
  | "products"
  | "productComponents"
  | "b2bPricingTiers"
>;

export class PricingService {
  constructor(private readonly repositories: PricingRepositories) {}

  async calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    const [costParameters, printer, channelFees, sizeTierRanges, b2bTiers] = await Promise.all([
      this.repositories.costParameters.findCurrent(),
      this.repositories.printers.findById(input.printerId),
      this.repositories.channelFees.findAllCurrent(),
      this.repositories.sizeTierRanges.findAllCurrent(),
      this.repositories.b2bPricingTiers.findAllCurrent(),
    ]);

    if (!costParameters) {
      throw new Error("Nenhum parâmetro de custo vigente cadastrado.");
    }
    if (!printer) {
      throw new Error(`Impressora ${input.printerId} não encontrada.`);
    }

    let weightGrams = input.weightGrams;
    let printHours = input.printHours;
    let slicingSheetId: string | null = null;

    // Sem peso/tempo digitados: deriva da ficha de fatiamento cadastrada
    // para a peça + impressora (ver Requirement "Cálculo a partir de uma
    // ficha de fatiamento cadastrada").
    if (weightGrams === undefined || printHours === undefined) {
      if (!input.productId) {
        throw new Error(
          "Informe peso e tempo de impressão, ou informe a peça para usar uma ficha de fatiamento cadastrada.",
        );
      }
      const sheet = await this.repositories.slicingSheets.findByProductAndPrinter(input.productId, input.printerId);
      if (!sheet) {
        throw new Error(
          "Nenhuma ficha de fatiamento cadastrada para esta peça e impressora — informe peso e tempo manualmente.",
        );
      }
      weightGrams = sheet.materials.reduce((sum, material) => sum + material.pieceGrams, 0);
      printHours = sheet.printHours;
      slicingSheetId = sheet.id;
    }

    const costBreakdown = calculateCostBreakdown(weightGrams, printHours, printer.depreciationPerHour, costParameters);
    const totalCost = sumCostBreakdown(costBreakdown);

    const suggestedTier = classifyTier(weightGrams, printHours, sizeTierRanges);

    const channelPrices: ChannelPrice[] = channelFees.map((fee) => ({
      channel: fee.channel,
      ...calculateChannelPrice(totalCost, costParameters.targetMarginPct, fee.percentageFee, fee.fixedFee),
    }));

    const b2bPrices: B2bPrice[] = b2bTiers.map((tier) => calculateB2bPrice(totalCost, tier));

    return {
      weightGrams,
      printHours,
      printerId: input.printerId,
      productId: input.productId ?? null,
      slicingSheetId,
      costParametersId: costParameters.id,
      suggestedTier,
      totalCost,
      costBreakdown,
      channelPrices,
      b2bPrices,
      componentBreakdown: null,
    };
  }

  // chosenTier resolve o caso de ambiguidade (ver Decision 3 do design.md de
  // precificacao-telas): quando o motor sinaliza duas faixas candidatas, o
  // registro salvo usa o porte escolhido manualmente pelo usuário em vez do
  // estado ambíguo bruto.
  async calculateAndSavePrice(
    input: PriceCalculationInput,
    chosenTier?: SizeTier,
  ): Promise<PriceCalculation> {
    const result = await this.calculatePrice(input);
    const suggestedTier: SuggestedTier | null =
      result.suggestedTier?.ambiguous && chosenTier
        ? { ambiguous: false, tier: chosenTier }
        : result.suggestedTier;
    return this.repositories.priceCalculations.create({
      ...result,
      suggestedTier,
      createdBy: input.createdBy,
    });
  }

  // Custo/preço de uma peça composta: soma, componente a componente, do
  // custo do cálculo mais recente daquele componente (ou de um cálculo
  // gerado na hora via ficha de fatiamento, se ainda não houver um salvo)
  // multiplicado pela sua quantidade — ver Requirement "Custo agregado de
  // peça composta".
  async calculateCompositePrice(input: CalculateCompositePriceInput): Promise<PriceCalculationResult> {
    const [costParameters, channelFees, b2bTiers, product] = await Promise.all([
      this.repositories.costParameters.findCurrent(),
      this.repositories.channelFees.findAllCurrent(),
      this.repositories.b2bPricingTiers.findAllCurrent(),
      this.repositories.products.findById(input.productId),
    ]);

    if (!costParameters) {
      throw new Error("Nenhum parâmetro de custo vigente cadastrado.");
    }
    if (!product) {
      throw new Error(`Peça ${input.productId} não encontrada.`);
    }
    if (product.productType !== "composta") {
      throw new Error(`Peça "${product.name}" não é do tipo composta.`);
    }

    const components = await this.repositories.productComponents.findByParentId(input.productId);
    if (components.length === 0) {
      throw new Error(`Peça composta "${product.name}" não tem componentes cadastrados.`);
    }

    const aggregatedBreakdown: CostBreakdown = {
      filamentCost: 0,
      energyCost: 0,
      depreciationCost: 0,
      failureReserveCost: 0,
      packagingCost: 0,
    };
    const componentBreakdown: CompositeComponentCost[] = [];

    for (const component of components) {
      const resolved = await this.resolveComponentCost(component.componentProductId, input.createdBy);
      addWeightedBreakdown(aggregatedBreakdown, resolved.costBreakdown, component.quantity);
      componentBreakdown.push({
        componentProductId: component.componentProductId,
        quantity: component.quantity,
        unitCost: resolved.totalCost,
        totalCost: resolved.totalCost * component.quantity,
      });
    }

    const totalCost = sumCostBreakdown(aggregatedBreakdown);

    const channelPrices: ChannelPrice[] = channelFees.map((fee) => ({
      channel: fee.channel,
      ...calculateChannelPrice(totalCost, costParameters.targetMarginPct, fee.percentageFee, fee.fixedFee),
    }));
    const b2bPrices: B2bPrice[] = b2bTiers.map((tier) => calculateB2bPrice(totalCost, tier));

    return {
      weightGrams: null,
      printHours: null,
      printerId: null,
      productId: input.productId,
      slicingSheetId: null,
      costParametersId: costParameters.id,
      suggestedTier: null,
      totalCost,
      costBreakdown: aggregatedBreakdown,
      channelPrices,
      b2bPrices,
      componentBreakdown,
    };
  }

  async calculateAndSaveCompositePrice(input: CalculateCompositePriceInput): Promise<PriceCalculation> {
    const result = await this.calculateCompositePrice(input);
    return this.repositories.priceCalculations.create({ ...result, createdBy: input.createdBy });
  }

  // Custo unitário de um componente: reaproveita o cálculo mais recente já
  // vinculado à peça (products.price_calculation_id) quando existir; caso
  // contrário, exige uma ficha de fatiamento cadastrada e calcula (sem
  // vincular automaticamente — ver Requirement "Componente sem cálculo
  // salvo mas com ficha de fatiamento").
  private async resolveComponentCost(
    componentProductId: string,
    createdBy: string | null,
  ): Promise<{ totalCost: number; costBreakdown: CostBreakdown }> {
    const component = await this.repositories.products.findById(componentProductId);
    if (!component) {
      throw new Error(`Peça componente ${componentProductId} não encontrada.`);
    }

    if (component.priceCalculationId) {
      const calculation = await this.repositories.priceCalculations.findById(component.priceCalculationId);
      if (calculation) {
        return { totalCost: calculation.totalCost, costBreakdown: calculation.costBreakdown };
      }
    }

    const sheets = await this.repositories.slicingSheets.findByProductId(componentProductId);
    const sheet = sheets[0];
    if (!sheet) {
      throw new Error(
        `Peça componente "${component.name}" não tem ficha de fatiamento nem cálculo de preço salvo — cadastre um dos dois antes de usá-la como componente.`,
      );
    }

    const calculated = await this.calculateAndSavePrice({
      printerId: sheet.printerId,
      productId: componentProductId,
      createdBy,
    });

    return { totalCost: calculated.totalCost, costBreakdown: calculated.costBreakdown };
  }
}
