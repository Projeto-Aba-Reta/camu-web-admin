import type { Repositories } from "@/lib/repositories";
import {
  addWeightedBreakdown,
  calculateB2bPrice,
  calculateChannelPrice,
  calculateCostBreakdown,
  classifyTier,
  findTierRange,
  resolveB2bMargin,
  resolveB2cMargin,
  sumCostBreakdown,
} from "@/lib/services/pricing-formula";
import type {
  B2bPrice,
  CalculateCompositePriceInput,
  ChannelPrice,
  CompositeComponentCost,
  CostBreakdown,
  EffectiveMargin,
  PriceCalculation,
  PriceCalculationInput,
  PriceCalculationResult,
  SizeTier,
  SizeTierRange,
  SuggestedTier,
} from "@/types/pricing";

// A fórmula em si vive em pricing-formula.ts (funções puras, compartilhadas
// com o simulador). Aqui fica o que depende de repositório: buscar os
// parâmetros vigentes, resolver o porte da peça e montar o snapshot salvo.
export { classifyTier } from "@/lib/services/pricing-formula";

type PricingRepositories = Pick<
  Repositories,
  | "costParameters"
  | "printers"
  | "channelFees"
  | "sizeTierRanges"
  | "sizeTiers"
  | "priceCalculations"
  | "slicingSheets"
  | "products"
  | "productComponents"
  | "b2bPricingTiers"
>;

export class PricingService {
  constructor(private readonly repositories: PricingRepositories) {}

  async calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    const [costParameters, printer, channelFees, sizeTierRanges, sizeTiers, b2bTiers] = await Promise.all([
      this.repositories.costParameters.findCurrent(),
      this.repositories.printers.findById(input.printerId),
      this.repositories.channelFees.findAllCurrent(),
      this.repositories.sizeTierRanges.findAllCurrent(),
      this.repositories.sizeTiers.findAll(),
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

    const classified = classifyTier(weightGrams, printHours, sizeTierRanges, sizeTiers);
    // Porte escolhido pelo usuário vence a classificação automática: é assim
    // que a ambiguidade é resolvida, e a escolha muda a margem aplicada, não
    // só o rótulo (ver Requirement "Porte ambíguo resolvido pelo usuário
    // altera a margem aplicada").
    const suggestedTier: SuggestedTier = input.chosenTier
      ? { ambiguous: false, tier: input.chosenTier }
      : classified;

    // Ambíguo e sem escolha: devolve o preview com a margem do primeiro
    // candidato apenas para a UI ter números a exibir — o cálculo não é
    // salvo enquanto o porte não for resolvido.
    const tierForMargin = suggestedTier.ambiguous ? suggestedTier.candidates[0] : suggestedTier.tier;
    const priced = this.priceFromCost(
      totalCost,
      tierForMargin,
      sizeTierRanges,
      costParameters.targetMarginPct,
      channelFees,
      b2bTiers,
    );

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
      componentBreakdown: null,
      ...priced,
    };
  }

  // chosenTier resolve o caso de ambiguidade: quando o motor sinaliza duas
  // faixas candidatas, a escolha do usuário define tanto o porte salvo
  // quanto a margem aplicada, então o cálculo é refeito com ela.
  async calculateAndSavePrice(
    input: PriceCalculationInput,
    chosenTier?: SizeTier,
  ): Promise<PriceCalculation> {
    const result = await this.calculatePrice({ ...input, chosenTier: chosenTier ?? input.chosenTier });

    // Nenhum cálculo é salvo sem porte resolvido — sem porte não há margem a
    // aplicar (ver Requirement "Porte resolvido é obrigatório para salvar um
    // cálculo").
    if (result.suggestedTier?.ambiguous) {
      throw new Error(
        "Peso e tempo indicam portes diferentes — escolha o porte da peça antes de salvar o cálculo.",
      );
    }

    return this.repositories.priceCalculations.create({
      ...result,
      createdBy: input.createdBy,
    });
  }

  // Custo/preço de uma peça composta: soma, componente a componente, do
  // custo do cálculo mais recente daquele componente (ou de um cálculo
  // gerado na hora via ficha de fatiamento, se ainda não houver um salvo)
  // multiplicado pela sua quantidade — ver Requirement "Custo agregado de
  // peça composta".
  async calculateCompositePrice(input: CalculateCompositePriceInput): Promise<PriceCalculationResult> {
    // Uma peça composta não tem um único peso/tempo a classificar, e o porte
    // determina a margem — então ele precisa vir do usuário (ver design.md,
    // Decisão 3).
    if (!input.chosenTier) {
      throw new Error(
        "Escolha o porte (P, M ou G) da peça composta antes de calcular — o porte determina a margem de lucro aplicada.",
      );
    }

    const [costParameters, channelFees, sizeTierRanges, b2bTiers, product] = await Promise.all([
      this.repositories.costParameters.findCurrent(),
      this.repositories.channelFees.findAllCurrent(),
      this.repositories.sizeTierRanges.findAllCurrent(),
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
    const priced = this.priceFromCost(
      totalCost,
      input.chosenTier,
      sizeTierRanges,
      costParameters.targetMarginPct,
      channelFees,
      b2bTiers,
    );

    return {
      weightGrams: null,
      printHours: null,
      printerId: null,
      productId: input.productId,
      slicingSheetId: null,
      costParametersId: costParameters.id,
      suggestedTier: { ambiguous: false, tier: input.chosenTier },
      totalCost,
      costBreakdown: aggregatedBreakdown,
      componentBreakdown,
      ...priced,
    };
  }

  async calculateAndSaveCompositePrice(input: CalculateCompositePriceInput): Promise<PriceCalculation> {
    const result = await this.calculateCompositePrice(input);
    return this.repositories.priceCalculations.create({ ...result, createdBy: input.createdBy });
  }

  // Projeta os preços B2C/B2B a partir do custo já apurado e do porte da
  // peça. A margem do porte é resolvida duas vezes, com bases diferentes: a
  // do B2C parte da margem-alvo global, a do B2B parte da margem de cada
  // faixa de volume (ver Requirement "Margem B2C e margem B2B configuradas
  // independentemente").
  private priceFromCost(
    totalCost: number,
    tier: SizeTier,
    sizeTierRanges: SizeTierRange[],
    targetMarginPct: number,
    channelFees: Array<{ channel: ChannelPrice["channel"]; percentageFee: number; fixedFee: number }>,
    b2bTiers: Array<{ minQuantity: number; targetMarginPct: number }>,
  ): { channelPrices: ChannelPrice[]; b2bPrices: B2bPrice[]; effectiveB2cMargin: EffectiveMargin } {
    const range = findTierRange(sizeTierRanges, tier);
    const effectiveB2cMargin = resolveB2cMargin(targetMarginPct, range);

    const channelPrices: ChannelPrice[] = channelFees.map((fee) => ({
      channel: fee.channel,
      ...calculateChannelPrice(totalCost, effectiveB2cMargin, fee.percentageFee, fee.fixedFee),
    }));

    const b2bPrices: B2bPrice[] = b2bTiers.map((volumeTier) =>
      calculateB2bPrice(
        totalCost,
        volumeTier.minQuantity,
        resolveB2bMargin(volumeTier.targetMarginPct, range),
      ),
    );

    return { channelPrices, b2bPrices, effectiveB2cMargin };
  }

  // Custo unitário de um componente: reaproveita o cálculo mais recente já
  // vinculado à peça (products.price_calculation_id) quando existir; caso
  // contrário, exige uma ficha de fatiamento cadastrada e calcula (sem
  // vincular automaticamente — ver Requirement "Componente sem cálculo
  // salvo mas com ficha de fatiamento"). O componente é sempre peça simples,
  // então o porte sai da classificação automática, sem exigir escolha.
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
