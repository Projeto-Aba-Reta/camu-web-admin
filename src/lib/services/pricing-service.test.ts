import { describe, it, expect } from "vitest";
import { classifyTier, PricingService } from "./pricing-service";
import type { ICostParameterRepository } from "@/lib/repositories/interfaces/cost-parameter-repository.interface";
import type { IPrinterRepository } from "@/lib/repositories/interfaces/printer-repository.interface";
import type { IChannelFeeRepository } from "@/lib/repositories/interfaces/channel-fee-repository.interface";
import type { ISizeTierRangeRepository } from "@/lib/repositories/interfaces/size-tier-range-repository.interface";
import type {
  CreatePriceCalculationInput,
  IPriceCalculationRepository,
} from "@/lib/repositories/interfaces/price-calculation-repository.interface";
import type {
  CreateB2bPricingTierInput,
  IB2bPricingTierRepository,
} from "@/lib/repositories/interfaces/b2b-pricing-tier-repository.interface";
import type {
  ISlicingSheetRepository,
  UpsertSlicingSheetInput,
} from "@/lib/repositories/interfaces/slicing-sheet-repository.interface";
import type {
  CreateProductInput,
  IProductRepository,
  UpdateProductInput,
} from "@/lib/repositories/interfaces/product-repository.interface";
import type {
  CreateProductComponentInput,
  IProductComponentRepository,
} from "@/lib/repositories/interfaces/product-component-repository.interface";
import type {
  B2bPricingTier,
  ChannelFee,
  CostParameters,
  PriceCalculation,
  Printer,
  SizeTierRange,
} from "@/types/pricing";
import type { Product, ProductComponent } from "@/types/catalog";
import type { SlicingSheet } from "@/types/slicing-sheet";

// Mesmas faixas de referência do scripts/seed-pricing.ts (P ~15g/~2,1h,
// M ~35g/~4,2h, G ~80g/~8,4h, com folga min/max).
const SIZE_TIER_RANGES: SizeTierRange[] = [
  { id: "t-p", tier: "P", minWeightGrams: 5, maxWeightGrams: 20, minPrintHours: 0.5, maxPrintHours: 3, validFrom: "2026-01-01" },
  { id: "t-m", tier: "M", minWeightGrams: 20, maxWeightGrams: 55, minPrintHours: 3, maxPrintHours: 6, validFrom: "2026-01-01" },
  { id: "t-g", tier: "G", minWeightGrams: 55, maxWeightGrams: 150, minPrintHours: 6, maxPrintHours: 12, validFrom: "2026-01-01" },
];

const ENDER_3: Printer = {
  id: "printer-1",
  name: "Ender-3 V3 SE",
  model: "Ender-3 V3 SE",
  depreciationPerHour: 0.8,
  isActive: true,
  validFrom: "2026-01-01",
  createdBy: null,
};

function makeCostParameters(overrides: Partial<CostParameters> = {}): CostParameters {
  return {
    id: "cost-v1",
    filamentCostPerKg: 130,
    energyCostPerKwh: 0.8,
    averagePowerWatts: 150,
    failureReservePct: 0.125,
    packagingCost: 3,
    targetMarginPct: 0,
    validFrom: "2026-01-01",
    createdBy: null,
    ...overrides,
  };
}

class FakeCostParameterRepository implements ICostParameterRepository {
  constructor(public current: CostParameters) {}
  async findCurrent() {
    return this.current;
  }
  async findById(id: string) {
    return this.current.id === id ? this.current : null;
  }
  async findHistory() {
    return [this.current];
  }
  async create(): Promise<CostParameters> {
    throw new Error("not implemented in fake");
  }
}

class FakePrinterRepository implements IPrinterRepository {
  constructor(private readonly printers: Printer[]) {}
  async findActive() {
    return this.printers.filter((p) => p.isActive);
  }
  async findAll() {
    return this.printers;
  }
  async findById(id: string) {
    return this.printers.find((p) => p.id === id) ?? null;
  }
  async create(): Promise<Printer> {
    throw new Error("not implemented in fake");
  }
  async setActive(): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

class FakeChannelFeeRepository implements IChannelFeeRepository {
  constructor(private readonly fees: ChannelFee[]) {}
  async findAllCurrent() {
    return this.fees;
  }
  async findCurrentForChannel(channel: string) {
    return this.fees.find((f) => f.channel === channel) ?? null;
  }
  async findHistoryForChannel() {
    return [];
  }
  async findAllHistory() {
    return this.fees;
  }
  async create(): Promise<ChannelFee> {
    throw new Error("not implemented in fake");
  }
}

class FakeSizeTierRangeRepository implements ISizeTierRangeRepository {
  constructor(private readonly ranges: SizeTierRange[]) {}
  async findAllCurrent() {
    return this.ranges;
  }
  async findAllHistory() {
    return this.ranges;
  }
  async create(): Promise<SizeTierRange> {
    throw new Error("not implemented in fake");
  }
}

class FakePriceCalculationRepository implements IPriceCalculationRepository {
  public saved: PriceCalculation[] = [];
  async findById(id: string) {
    return this.saved.find((c) => c.id === id) ?? null;
  }
  async findRecent() {
    return this.saved;
  }
  async create(input: CreatePriceCalculationInput): Promise<PriceCalculation> {
    const record: PriceCalculation = {
      ...input,
      id: `calc-${this.saved.length + 1}`,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.saved.push(record);
    return record;
  }
}

class FakeB2bPricingTierRepository implements IB2bPricingTierRepository {
  constructor(private readonly tiers: B2bPricingTier[]) {}
  async findAllCurrent() {
    return this.tiers;
  }
  async findAllHistory() {
    return this.tiers;
  }
  async create(input: CreateB2bPricingTierInput): Promise<B2bPricingTier> {
    throw new Error("not implemented in fake" + JSON.stringify(input));
  }
}

class FakeSlicingSheetRepository implements ISlicingSheetRepository {
  constructor(private readonly sheets: SlicingSheet[]) {}
  async findByProductId(productId: string) {
    return this.sheets.filter((sheet) => sheet.productId === productId);
  }
  async findByProductAndPrinter(productId: string, printerId: string) {
    return this.sheets.find((sheet) => sheet.productId === productId && sheet.printerId === printerId) ?? null;
  }
  async upsert(input: UpsertSlicingSheetInput): Promise<SlicingSheet> {
    throw new Error("not implemented in fake" + JSON.stringify(input));
  }
  async delete(): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

class FakeProductRepository implements IProductRepository {
  constructor(private readonly products: Product[]) {}
  async findById(id: string) {
    return this.products.find((p) => p.id === id) ?? null;
  }
  async findAll() {
    return this.products;
  }
  async create(input: CreateProductInput): Promise<Product> {
    throw new Error("not implemented in fake" + JSON.stringify(input));
  }
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new Error(`product ${id} not found in fake`);
    Object.assign(product, input);
    return product;
  }
  async delete(): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

class FakeProductComponentRepository implements IProductComponentRepository {
  constructor(private readonly components: ProductComponent[]) {}
  async findByParentId(parentProductId: string) {
    return this.components.filter((c) => c.parentProductId === parentProductId);
  }
  async findAllByParentIds(parentProductIds: string[]) {
    return this.components.filter((c) => parentProductIds.includes(c.parentProductId));
  }
  async create(input: CreateProductComponentInput): Promise<ProductComponent> {
    throw new Error("not implemented in fake" + JSON.stringify(input));
  }
  async remove(): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

interface MakeServiceOptions {
  b2bTiers?: B2bPricingTier[];
  slicingSheets?: SlicingSheet[];
  products?: Product[];
  productComponents?: ProductComponent[];
}

function makeService(costParameters: CostParameters, options: MakeServiceOptions = {}) {
  const printers = new FakePrinterRepository([ENDER_3]);
  const channelFees = new FakeChannelFeeRepository([
    { id: "fee-ml", channel: "mercado_livre", percentageFee: 0.14, fixedFee: 0, validFrom: "2026-01-01", createdBy: null },
  ]);
  const sizeTierRanges = new FakeSizeTierRangeRepository(SIZE_TIER_RANGES);
  const priceCalculations = new FakePriceCalculationRepository();
  const costParametersRepo = new FakeCostParameterRepository(costParameters);
  const b2bPricingTiers = new FakeB2bPricingTierRepository(options.b2bTiers ?? []);
  const slicingSheets = new FakeSlicingSheetRepository(options.slicingSheets ?? []);
  const products = new FakeProductRepository(options.products ?? []);
  const productComponents = new FakeProductComponentRepository(options.productComponents ?? []);

  const service = new PricingService({
    costParameters: costParametersRepo,
    printers,
    channelFees,
    sizeTierRanges,
    priceCalculations,
    slicingSheets,
    products,
    productComponents,
    b2bPricingTiers,
  });

  return { service, costParametersRepo, priceCalculations, products };
}

describe("PricingService.calculatePrice", () => {
  // Valores de referência de custo-por-peca.md: P ≈ R$7, M ≈ R$12, G ≈ R$32
  // (calculados com o filamento antigo de R$90/kg). Com o filamento
  // atualizado para R$130/kg (sessão de 12/07/2026), os valores absolutos
  // sobem, mas a tolerância de ordem de grandeza (dentro de 50% do valor de
  // referência antigo) segue cobrindo a variação, já que o motor deste
  // schema ainda não modela custo de pós-processo por tier (ver Open
  // Questions do design.md).
  it.each([
    { label: "P", weightGrams: 15, printHours: 2.1, reference: 7 },
    { label: "M", weightGrams: 35, printHours: 4.2, reference: 12 },
    { label: "G", weightGrams: 80, printHours: 8.4, reference: 32 },
  ])("calcula o custo de uma peça $label próximo do valor de referência", async ({ weightGrams, printHours, reference }) => {
    const { service } = makeService(makeCostParameters());
    const result = await service.calculatePrice({
      weightGrams,
      printHours,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    expect(result.totalCost).toBeGreaterThan(reference * 0.5);
    expect(result.totalCost).toBeLessThan(reference * 2);
    expect(result.totalCost).toBeCloseTo(
      result.costBreakdown.filamentCost +
        result.costBreakdown.energyCost +
        result.costBreakdown.depreciationCost +
        result.costBreakdown.failureReserveCost +
        result.costBreakdown.packagingCost,
      6,
    );
  });

  it("classifica peça M quando peso e tempo caem na mesma faixa", async () => {
    const { service } = makeService(makeCostParameters());
    const result = await service.calculatePrice({
      weightGrams: 35,
      printHours: 4.2,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    expect(result.suggestedTier).toEqual({ ambiguous: false, tier: "M" });
  });

  it("sinaliza ambiguidade quando peso e tempo caem em faixas conflitantes", async () => {
    const { service } = makeService(makeCostParameters());
    // 15g cai na faixa P, mas 8,4h cai na faixa G.
    const result = await service.calculatePrice({
      weightGrams: 15,
      printHours: 8.4,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    expect(result.suggestedTier).toEqual({ ambiguous: true, candidates: ["P", "G"] });
  });

  it("calcula preço sugerido e margem por canal ativo, com margem-alvo zerada preservando o preço de equilíbrio", async () => {
    const { service } = makeService(makeCostParameters());
    const result = await service.calculatePrice({
      weightGrams: 35,
      printHours: 4.2,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    expect(result.channelPrices).toHaveLength(1);
    const [mlPrice] = result.channelPrices;
    expect(mlPrice.channel).toBe("mercado_livre");
    expect(mlPrice.suggestedPrice).toBeCloseTo(result.totalCost / (1 - 0.14), 6);
  });

  it("aplica a margem-alvo B2C antes da taxa de canal", async () => {
    const { service } = makeService(makeCostParameters({ targetMarginPct: 0.2 }));
    const result = await service.calculatePrice({
      weightGrams: 35,
      printHours: 4.2,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    const [mlPrice] = result.channelPrices;
    expect(mlPrice.suggestedPrice).toBeCloseTo((result.totalCost * 1.2) / (1 - 0.14), 6);
  });

  it("deriva peso e tempo de uma ficha de fatiamento cadastrada quando não digitados", async () => {
    const sheet = {
      id: "sheet-1",
      productId: "product-1",
      printerId: ENDER_3.id,
      printHours: 4.2,
      materials: [
        { id: "m1", materialId: "mat-branco", pieceGrams: 30, supportGrams: 5 },
        { id: "m2", materialId: "mat-preto", pieceGrams: 5, supportGrams: 0 },
      ],
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const { service } = makeService(makeCostParameters(), { slicingSheets: [sheet] });

    const result = await service.calculatePrice({
      printerId: ENDER_3.id,
      productId: "product-1",
      createdBy: null,
    });

    expect(result.weightGrams).toBe(35);
    expect(result.printHours).toBe(4.2);
    expect(result.slicingSheetId).toBe("sheet-1");
  });

  it("rejeita cálculo sem peso/tempo quando não há ficha cadastrada para a peça e impressora", async () => {
    const { service } = makeService(makeCostParameters());
    await expect(
      service.calculatePrice({ printerId: ENDER_3.id, productId: "product-sem-ficha", createdBy: null }),
    ).rejects.toThrow();
  });

  it("calcula preço B2B por faixa de volume, sem taxa de canal", async () => {
    const { service } = makeService(makeCostParameters(), {
      b2bTiers: [{ id: "tier-20", minQuantity: 20, targetMarginPct: 0.25, validFrom: "2026-01-01", createdBy: null }],
    });
    const result = await service.calculatePrice({
      weightGrams: 35,
      printHours: 4.2,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    expect(result.b2bPrices).toHaveLength(1);
    expect(result.b2bPrices[0].minQuantity).toBe(20);
    expect(result.b2bPrices[0].suggestedPrice).toBeCloseTo(result.totalCost * 1.25, 6);
    expect(result.b2bPrices[0].margin).toBeCloseTo(result.totalCost * 0.25, 6);
  });
});

describe("PricingService.calculateAndSavePrice", () => {
  it("preserva o cálculo salvo mesmo depois que os parâmetros de custo mudam", async () => {
    const { service, costParametersRepo, priceCalculations } = makeService(makeCostParameters());

    const saved = await service.calculateAndSavePrice({
      weightGrams: 35,
      printHours: 4.2,
      printerId: ENDER_3.id,
      createdBy: "user-1",
    });

    // Nova vigência de parâmetros (ex.: filamento subiu de preço) não deve
    // alterar o registro já persistido.
    costParametersRepo.current = makeCostParameters({
      id: "cost-v2",
      filamentCostPerKg: 150,
      validFrom: "2026-02-01",
    });

    const reloaded = await priceCalculations.findById(saved.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.totalCost).toBe(saved.totalCost);
    expect(reloaded!.costParametersId).toBe("cost-v1");
    expect(reloaded!.costBreakdown).toEqual(saved.costBreakdown);
  });
});

describe("PricingService.calculateCompositePrice", () => {
  const DECAGONO: Product = {
    id: "decagono",
    name: "Base branca (decágono central)",
    description: null,
    category: "linha_leon",
    sizeTier: "M",
    status: "ativo",
    productType: "simples",
    priceCalculationId: "calc-decagono",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const CUNHA: Product = {
    ...DECAGONO,
    id: "cunha",
    name: "Cunha",
    priceCalculationId: null,
  };
  const MANDALA: Product = {
    ...DECAGONO,
    id: "mandala",
    name: "Caixa Mandala",
    productType: "composta",
    priceCalculationId: null,
  };

  function makeSavedCalculation(id: string, totalCost: number): PriceCalculation {
    return {
      id,
      weightGrams: 10,
      printHours: 1,
      printerId: ENDER_3.id,
      productId: null,
      slicingSheetId: null,
      costParametersId: "cost-v1",
      suggestedTier: { ambiguous: false, tier: "M" },
      totalCost,
      costBreakdown: {
        filamentCost: totalCost * 0.6,
        energyCost: totalCost * 0.2,
        depreciationCost: totalCost * 0.1,
        failureReserveCost: totalCost * 0.05,
        packagingCost: totalCost * 0.05,
      },
      channelPrices: [],
      b2bPrices: [],
      componentBreakdown: null,
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
  }

  it("agrega o custo de cada componente multiplicado pela quantidade", async () => {
    const { service, priceCalculations } = makeService(makeCostParameters(), {
      products: [DECAGONO, CUNHA, MANDALA],
      productComponents: [
        { id: "pc-1", parentProductId: "mandala", componentProductId: "decagono", quantity: 1, createdBy: null, createdAt: "2026-01-01" },
        { id: "pc-2", parentProductId: "mandala", componentProductId: "cunha", quantity: 10, createdBy: null, createdAt: "2026-01-01" },
      ],
      slicingSheets: [
        {
          id: "sheet-cunha",
          productId: "cunha",
          printerId: ENDER_3.id,
          printHours: 0.885,
          materials: [{ id: "m1", materialId: "mat", pieceGrams: 11.72, supportGrams: 0 }],
          createdBy: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    priceCalculations.saved.push(makeSavedCalculation("calc-decagono", 6.34));

    const result = await service.calculateCompositePrice({ productId: "mandala", createdBy: null });

    expect(result.componentBreakdown).toHaveLength(2);
    const decagonoLine = result.componentBreakdown!.find((c) => c.componentProductId === "decagono")!;
    expect(decagonoLine.unitCost).toBe(6.34);
    expect(decagonoLine.totalCost).toBe(6.34);

    const cunhaLine = result.componentBreakdown!.find((c) => c.componentProductId === "cunha")!;
    expect(cunhaLine.quantity).toBe(10);
    expect(cunhaLine.totalCost).toBeCloseTo(cunhaLine.unitCost * 10, 6);

    expect(result.totalCost).toBeCloseTo(decagonoLine.totalCost + cunhaLine.totalCost, 6);
    expect(result.suggestedTier).toBeNull();
    expect(result.weightGrams).toBeNull();
  });

  it("calcula e salva um novo cálculo para um componente sem cálculo salvo, usando a ficha de fatiamento", async () => {
    const { service, priceCalculations } = makeService(makeCostParameters(), {
      products: [DECAGONO, CUNHA, MANDALA],
      productComponents: [
        { id: "pc-2", parentProductId: "mandala", componentProductId: "cunha", quantity: 1, createdBy: null, createdAt: "2026-01-01" },
      ],
      slicingSheets: [
        {
          id: "sheet-cunha",
          productId: "cunha",
          printerId: ENDER_3.id,
          printHours: 0.885,
          materials: [{ id: "m1", materialId: "mat", pieceGrams: 11.72, supportGrams: 0 }],
          createdBy: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    await service.calculateCompositePrice({ productId: "mandala", createdBy: null });

    // O cálculo automático do componente sem price_calculation_id prévio
    // deve ter sido salvo no histórico (ver Requirement "Componente sem
    // cálculo salvo mas com ficha de fatiamento").
    expect(priceCalculations.saved.some((c) => c.productId === "cunha")).toBe(true);
  });

  it("rejeita cálculo de componente sem ficha de fatiamento nem cálculo salvo", async () => {
    const { service } = makeService(makeCostParameters(), {
      products: [DECAGONO, CUNHA, MANDALA],
      productComponents: [
        { id: "pc-2", parentProductId: "mandala", componentProductId: "cunha", quantity: 1, createdBy: null, createdAt: "2026-01-01" },
      ],
    });

    await expect(service.calculateCompositePrice({ productId: "mandala", createdBy: null })).rejects.toThrow();
  });
});

describe("classifyTier", () => {
  it("lança erro quando nenhuma faixa vigente cobre o peso/tempo informado", () => {
    expect(() => classifyTier(1000, 100, SIZE_TIER_RANGES)).toThrow();
  });
});
