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
  CreatePiecePartInput,
  IProductPartRepository,
  UpdatePiecePartInput,
} from "@/lib/repositories/interfaces/product-part-repository.interface";
import type { IMaterialRepository } from "@/lib/repositories/interfaces/material-repository.interface";
import type {
  B2bPricingTier,
  ChannelFee,
  CostParameters,
  PriceCalculation,
  Printer,
  SizeTier,
  SizeTierDefinition,
  SizeTierRange,
} from "@/types/pricing";
import type {
  CreateSizeTierInput,
  ISizeTierRepository,
  UpdateSizeTierInput,
} from "@/lib/repositories/interfaces/size-tier-repository.interface";
import type { Product, ProductComponent, PiecePart } from "@/types/catalog";
import type { SlicingSheet } from "@/types/slicing-sheet";
import type { Material } from "@/types/inventory";

// Portes cadastrados de referência: P/M/G de sistema, na ordem da régua.
const SIZE_TIERS_DEF: SizeTierDefinition[] = [
  { code: "P", label: "Pequena", sortOrder: 10, isSystem: true, createdBy: null, createdAt: "2026-01-01" },
  { code: "M", label: "Média", sortOrder: 20, isSystem: true, createdBy: null, createdAt: "2026-01-01" },
  { code: "G", label: "Grande", sortOrder: 30, isSystem: true, createdBy: null, createdAt: "2026-01-01" },
];

// Mesmas faixas de referência do scripts/seed-pricing.ts (P ~15g/~2,1h,
// M ~35g/~4,2h, G ~80g/~8,4h, com folga min/max).
//
// Sem margem por porte (0 / "somar"): é a faixa legada, e é o que preserva o
// preço anterior à margem por porte. Os testes que exercitam a margem por
// porte constroem suas próprias faixas com makeRanges().
const NO_TIER_MARGIN = {
  b2cMarginPct: 0,
  b2cMarginMode: "somar",
  b2bMarginPct: 0,
  b2bMarginMode: "somar",
} satisfies Pick<SizeTierRange, "b2cMarginPct" | "b2cMarginMode" | "b2bMarginPct" | "b2bMarginMode">;

const SIZE_TIER_RANGES: SizeTierRange[] = [
  { id: "t-p", tier: "P", minWeightGrams: 5, maxWeightGrams: 20, minPrintHours: 0.5, maxPrintHours: 3, validFrom: "2026-01-01", ...NO_TIER_MARGIN },
  { id: "t-m", tier: "M", minWeightGrams: 20, maxWeightGrams: 55, minPrintHours: 3, maxPrintHours: 6, validFrom: "2026-01-01", ...NO_TIER_MARGIN },
  { id: "t-g", tier: "G", minWeightGrams: 55, maxWeightGrams: 150, minPrintHours: 6, maxPrintHours: 12, validFrom: "2026-01-01", ...NO_TIER_MARGIN },
];

// Mesmas faixas, com a margem de um porte sobrescrita.
function makeRanges(tier: SizeTier, margins: Partial<SizeTierRange>): SizeTierRange[] {
  return SIZE_TIER_RANGES.map((range) => (range.tier === tier ? { ...range, ...margins } : range));
}

const ENDER_3: Printer = {
  id: "printer-1",
  name: "Ender-3 V3 SE",
  model: "Ender-3 V3 SE",
  depreciationPerHour: 0.8,
  isActive: true,
  validFrom: "2026-01-01",
  createdBy: null,
};

// Mesmo packaging_cost usado em makeCostParameters — a embalagem entra uma
// única vez no custo de uma peça composta.
const PACKAGING_COST = 3;

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

class FakeSizeTierRepository implements ISizeTierRepository {
  constructor(private readonly tiers: SizeTierDefinition[]) {}
  async findAll() {
    return this.tiers;
  }
  async findByCode(code: string) {
    return this.tiers.find((tier) => tier.code === code) ?? null;
  }
  async create(input: CreateSizeTierInput): Promise<SizeTierDefinition> {
    throw new Error("not implemented in fake" + JSON.stringify(input));
  }
  async update(code: string, input: UpdateSizeTierInput): Promise<SizeTierDefinition> {
    throw new Error("not implemented in fake" + code + JSON.stringify(input));
  }
  async remove(): Promise<void> {
    throw new Error("not implemented in fake");
  }
  async countReferences(): Promise<number> {
    return 0;
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
  async findAll() {
    return this.sheets;
  }
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
  async findBySlug(slug: string) {
    return this.products.find((p) => p.slug === slug) ?? null;
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
  async findByComponentProductId(componentProductId: string) {
    return this.components.filter((c) => c.componentProductId === componentProductId);
  }
}

class FakeProductPartRepository implements IProductPartRepository {
  constructor(private readonly parts: PiecePart[]) {}
  async findByProductId(productId: string) {
    return this.parts.filter((p) => p.productId === productId);
  }
  async create(input: CreatePiecePartInput): Promise<PiecePart> {
    throw new Error("not implemented in fake" + JSON.stringify(input));
  }
  async update(id: string, input: UpdatePiecePartInput): Promise<PiecePart> {
    throw new Error("not implemented in fake" + id + JSON.stringify(input));
  }
  async remove(): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

class FakeMaterialRepository implements IMaterialRepository {
  constructor(private readonly materials: Material[]) {}
  async findById(id: string) {
    return this.materials.find((m) => m.id === id) ?? null;
  }
  async findAll() {
    return this.materials;
  }
  async create(): Promise<Material> {
    throw new Error("not implemented in fake");
  }
  async update(): Promise<Material> {
    throw new Error("not implemented in fake");
  }
}

interface MakeServiceOptions {
  b2bTiers?: B2bPricingTier[];
  slicingSheets?: SlicingSheet[];
  products?: Product[];
  productComponents?: ProductComponent[];
  productParts?: PiecePart[];
  materials?: Material[];
  sizeTierRanges?: SizeTierRange[];
  sizeTiers?: SizeTierDefinition[];
}

function makeService(costParameters: CostParameters, options: MakeServiceOptions = {}) {
  const printers = new FakePrinterRepository([ENDER_3]);
  const channelFees = new FakeChannelFeeRepository([
    { id: "fee-ml", channel: "mercado_livre", percentageFee: 0.14, fixedFee: 0, validFrom: "2026-01-01", createdBy: null },
  ]);
  const sizeTierRanges = new FakeSizeTierRangeRepository(options.sizeTierRanges ?? SIZE_TIER_RANGES);
  const sizeTiers = new FakeSizeTierRepository(options.sizeTiers ?? SIZE_TIERS_DEF);
  const priceCalculations = new FakePriceCalculationRepository();
  const costParametersRepo = new FakeCostParameterRepository(costParameters);
  const b2bPricingTiers = new FakeB2bPricingTierRepository(options.b2bTiers ?? []);
  const slicingSheets = new FakeSlicingSheetRepository(options.slicingSheets ?? []);
  const products = new FakeProductRepository(options.products ?? []);
  const productComponents = new FakeProductComponentRepository(options.productComponents ?? []);
  const productParts = new FakeProductPartRepository(options.productParts ?? []);
  const materials = new FakeMaterialRepository(options.materials ?? []);

  const service = new PricingService({
    costParameters: costParametersRepo,
    printers,
    channelFees,
    sizeTierRanges,
    sizeTiers,
    priceCalculations,
    slicingSheets,
    products,
    productComponents,
    productParts,
    materials,
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

// Peça M de referência (35g / 4,2h), usada por todos os testes de margem.
const PECA_M = { weightGrams: 35, printHours: 4.2, printerId: ENDER_3.id, createdBy: null };

describe("margem de lucro por faixa de porte", () => {
  it("soma a margem do porte à margem-alvo B2C", async () => {
    const { service } = makeService(makeCostParameters({ targetMarginPct: 0.15 }), {
      sizeTierRanges: makeRanges("M", { b2cMarginPct: 0.2, b2cMarginMode: "somar" }),
    });
    const result = await service.calculatePrice(PECA_M);

    expect(result.effectiveB2cMargin).toEqual({
      basePct: 0.15,
      tierMarginPct: 0.2,
      mode: "somar",
      effectivePct: expect.closeTo(0.35, 6),
    });
    expect(result.channelPrices[0].suggestedPrice).toBeCloseTo((result.totalCost * 1.35) / (1 - 0.14), 6);
  });

  it("substitui a margem-alvo B2C pela margem do porte", async () => {
    const { service } = makeService(makeCostParameters({ targetMarginPct: 0.15 }), {
      sizeTierRanges: makeRanges("M", { b2cMarginPct: 0.08, b2cMarginMode: "substituir" }),
    });
    const result = await service.calculatePrice(PECA_M);

    // Os 15% da margem-alvo global não entram na conta.
    expect(result.effectiveB2cMargin?.effectivePct).toBeCloseTo(0.08, 6);
    expect(result.channelPrices[0].suggestedPrice).toBeCloseTo((result.totalCost * 1.08) / (1 - 0.14), 6);
  });

  it("preserva o preço anterior quando a faixa de porte não tem margem (0 no modo somar)", async () => {
    const { service } = makeService(makeCostParameters({ targetMarginPct: 0.2 }));
    const result = await service.calculatePrice(PECA_M);

    // Exatamente a conta da suíte anterior à margem por porte.
    expect(result.effectiveB2cMargin?.effectivePct).toBeCloseTo(0.2, 6);
    expect(result.channelPrices[0].suggestedPrice).toBeCloseTo((result.totalCost * 1.2) / (1 - 0.14), 6);
  });

  it("resolve B2C e B2B de forma independente: G soma no B2C e substitui no B2B", async () => {
    const { service } = makeService(makeCostParameters({ targetMarginPct: 0.15 }), {
      sizeTierRanges: makeRanges("G", {
        b2cMarginPct: 0.2,
        b2cMarginMode: "somar",
        b2bMarginPct: 0.1,
        b2bMarginMode: "substituir",
      }),
      b2bTiers: [
        { id: "tier-10", minQuantity: 10, targetMarginPct: 0.08, validFrom: "2026-01-01", createdBy: null },
        { id: "tier-50", minQuantity: 50, targetMarginPct: 0.05, validFrom: "2026-01-01", createdBy: null },
      ],
    });
    // 80g / 8,4h → porte G.
    const result = await service.calculatePrice({
      weightGrams: 80,
      printHours: 8.4,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    expect(result.effectiveB2cMargin?.effectivePct).toBeCloseTo(0.35, 6);
    // Substituir: as duas faixas de volume caem na mesma margem de 10%, cada
    // uma com sua própria base preservada no snapshot.
    expect(result.b2bPrices.map((p) => p.effectiveMargin.effectivePct)).toEqual([
      expect.closeTo(0.1, 6),
      expect.closeTo(0.1, 6),
    ]);
    expect(result.b2bPrices.map((p) => p.effectiveMargin.basePct)).toEqual([0.08, 0.05]);
    expect(result.b2bPrices[0].suggestedPrice).toBeCloseTo(result.totalCost * 1.1, 6);
  });

  it("soma a margem B2B do porte sobre a margem de cada faixa de volume, não sobre a margem-alvo B2C", async () => {
    const { service } = makeService(makeCostParameters({ targetMarginPct: 0.15 }), {
      sizeTierRanges: makeRanges("G", { b2bMarginPct: 0.1, b2bMarginMode: "somar" }),
      b2bTiers: [
        { id: "tier-10", minQuantity: 10, targetMarginPct: 0.08, validFrom: "2026-01-01", createdBy: null },
        { id: "tier-50", minQuantity: 50, targetMarginPct: 0.05, validFrom: "2026-01-01", createdBy: null },
      ],
    });
    const result = await service.calculatePrice({
      weightGrams: 80,
      printHours: 8.4,
      printerId: ENDER_3.id,
      createdBy: null,
    });

    // 8% + 10% e 5% + 10% — a margem-alvo B2C (15%) não participa do B2B.
    expect(result.b2bPrices[0].effectiveMargin.effectivePct).toBeCloseTo(0.18, 6);
    expect(result.b2bPrices[1].effectiveMargin.effectivePct).toBeCloseTo(0.15, 6);
    expect(result.b2bPrices[0].suggestedPrice).toBeCloseTo(result.totalCost * 1.18, 6);
  });

  it("recalcula os preços com a margem do porte escolhido ao resolver uma ambiguidade", async () => {
    const { service } = makeService(makeCostParameters({ targetMarginPct: 0.15 }), {
      sizeTierRanges: makeRanges("G", { b2cMarginPct: 0.2, b2cMarginMode: "somar" }),
    });
    // 15g cai na faixa P, mas 8,4h cai na faixa G.
    const ambiguo = { weightGrams: 15, printHours: 8.4, printerId: ENDER_3.id, createdBy: null };

    const preview = await service.calculatePrice(ambiguo);
    expect(preview.suggestedTier).toEqual({ ambiguous: true, candidates: ["P", "G"] });

    const escolhido = await service.calculatePrice({ ...ambiguo, chosenTier: "G" });
    expect(escolhido.suggestedTier).toEqual({ ambiguous: false, tier: "G" });
    // A escolha muda a margem aplicada, não só o rótulo: G soma 20%.
    expect(escolhido.effectiveB2cMargin?.effectivePct).toBeCloseTo(0.35, 6);
    expect(escolhido.channelPrices[0].suggestedPrice).toBeCloseTo(
      (escolhido.totalCost * 1.35) / (1 - 0.14),
      6,
    );
  });

  it("não salva um cálculo com porte ambíguo não resolvido", async () => {
    const { service, priceCalculations } = makeService(makeCostParameters());

    await expect(
      service.calculateAndSavePrice({ weightGrams: 15, printHours: 8.4, printerId: ENDER_3.id, createdBy: null }),
    ).rejects.toThrow(/porte/i);
    expect(priceCalculations.saved).toHaveLength(0);
  });

  it("registra a margem efetiva no snapshot salvo", async () => {
    const { service, priceCalculations } = makeService(makeCostParameters({ targetMarginPct: 0.15 }), {
      sizeTierRanges: makeRanges("M", { b2cMarginPct: 0.1, b2cMarginMode: "somar" }),
    });

    const saved = await service.calculateAndSavePrice({ ...PECA_M, createdBy: "user-1" });
    const reloaded = await priceCalculations.findById(saved.id);

    // O snapshot preserva a origem da margem — auditar o preço depois não
    // pode depender das faixas de porte vigentes hoje.
    expect(reloaded!.effectiveB2cMargin).toEqual({
      basePct: 0.15,
      tierMarginPct: 0.1,
      mode: "somar",
      effectivePct: expect.closeTo(0.25, 6),
    });
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
    slug: "base-branca-decagono-central",
    description: null,
    category: "linha_leon",
    sizeTier: "M",
    status: "ativo",
    productType: "simples",
    productionLeadDaysMin: null,
    productionLeadDaysMax: null,
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
      effectiveB2cMargin: null,
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

    const result = await service.calculateCompositePrice({
      productId: "mandala",
      chosenTier: "G",
      createdBy: null,
    });

    expect(result.componentBreakdown).toHaveLength(2);
    const componentLines = result.componentBreakdown!.filter((c) => c.kind !== "part");
    const decagonoLine = componentLines.find((c) => c.componentProductId === "decagono")!;
    // unitCost do componente exclui a embalagem própria (0,05 × 6,34 = 0,317),
    // porque a embalagem é contada uma única vez no conjunto — ver Requirement
    // "Custo agregado de peça composta".
    expect(decagonoLine.unitCost).toBeCloseTo(6.34 - 6.34 * 0.05, 6);
    expect(decagonoLine.totalCost).toBeCloseTo(6.34 - 6.34 * 0.05, 6);

    const cunhaLine = componentLines.find((c) => c.componentProductId === "cunha")!;
    expect(cunhaLine.quantity).toBe(10);
    expect(cunhaLine.totalCost).toBeCloseTo(cunhaLine.unitCost * 10, 6);

    // Total = soma dos itens (sem embalagem própria) + 1 embalagem do conjunto.
    expect(result.totalCost).toBeCloseTo(
      decagonoLine.totalCost + cunhaLine.totalCost + PACKAGING_COST,
      6,
    );
    expect(result.costBreakdown.packagingCost).toBe(PACKAGING_COST);
    // O porte da composta é o escolhido pelo usuário — não há peso/tempo
    // único a classificar.
    expect(result.suggestedTier).toEqual({ ambiguous: false, tier: "G" });
    expect(result.weightGrams).toBeNull();
  });

  it("rejeita cálculo de peça composta sem porte escolhido", async () => {
    const { service } = makeService(makeCostParameters(), {
      products: [DECAGONO, CUNHA, MANDALA],
      productComponents: [
        { id: "pc-1", parentProductId: "mandala", componentProductId: "decagono", quantity: 1, createdBy: null, createdAt: "2026-01-01" },
      ],
    });

    await expect(
      // @ts-expect-error — chosenTier é obrigatório no tipo; o teste garante
      // que o motor também rejeita em runtime (a action é uma fronteira de
      // dados não confiáveis).
      service.calculateCompositePrice({ productId: "mandala", createdBy: null }),
    ).rejects.toThrow(/porte/i);
  });

  it("aplica a margem do porte escolhido no preço da peça composta", async () => {
    const { service, priceCalculations } = makeService(makeCostParameters({ targetMarginPct: 0.15 }), {
      products: [DECAGONO, CUNHA, MANDALA],
      productComponents: [
        { id: "pc-1", parentProductId: "mandala", componentProductId: "decagono", quantity: 1, createdBy: null, createdAt: "2026-01-01" },
      ],
      sizeTierRanges: makeRanges("G", { b2cMarginPct: 0.2, b2cMarginMode: "somar" }),
    });
    priceCalculations.saved.push(makeSavedCalculation("calc-decagono", 6.34));

    const result = await service.calculateCompositePrice({
      productId: "mandala",
      chosenTier: "G",
      createdBy: null,
    });

    expect(result.effectiveB2cMargin?.effectivePct).toBeCloseTo(0.35, 6);
    expect(result.channelPrices[0].suggestedPrice).toBeCloseTo((result.totalCost * 1.35) / (1 - 0.14), 6);
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

    await service.calculateCompositePrice({ productId: "mandala", chosenTier: "M", createdBy: null });

    // O cálculo automático do componente sem price_calculation_id prévio
    // deve ter sido salvo no histórico (ver Requirement "Componente sem
    // cálculo salvo mas com ficha de fatiamento"). O componente é peça
    // simples, então o porte dele sai da classificação automática — só a
    // composta exige escolha.
    expect(priceCalculations.saved.some((c) => c.productId === "cunha")).toBe(true);
  });

  it("rejeita cálculo de componente sem ficha de fatiamento nem cálculo salvo", async () => {
    const { service } = makeService(makeCostParameters(), {
      products: [DECAGONO, CUNHA, MANDALA],
      productComponents: [
        { id: "pc-2", parentProductId: "mandala", componentProductId: "cunha", quantity: 1, createdBy: null, createdAt: "2026-01-01" },
      ],
    });

    await expect(
      service.calculateCompositePrice({ productId: "mandala", chosenTier: "M", createdBy: null }),
    ).rejects.toThrow();
  });

  const PLA_VERMELHO: Material = {
    id: "mat-red",
    name: "Filamento PLA Vermelho",
    type: "filamento",
    unit: "kg",
    referenceCost: 200,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  function makePart(overrides: Partial<PiecePart> & Pick<PiecePart, "id" | "name">): PiecePart {
    return {
      productId: "mandala",
      quantity: 1,
      materialId: null,
      pieceGrams: 10,
      supportGrams: 0,
      printerId: ENDER_3.id,
      printHours: 1,
      position: 0,
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("agrega partes inline: filamento do insumo vs. global, falha por parte e embalagem uma vez", async () => {
    const { service } = makeService(makeCostParameters(), {
      products: [MANDALA],
      materials: [PLA_VERMELHO],
      productParts: [
        makePart({ id: "part-dec", name: "Decágono", materialId: "mat-red", pieceGrams: 40, printHours: 3, quantity: 1 }),
        makePart({ id: "part-cun", name: "Cunha", materialId: null, pieceGrams: 8, printHours: 0.5, quantity: 10 }),
      ],
    });

    const result = await service.calculateCompositePrice({ productId: "mandala", chosenTier: "G", createdBy: null });

    const parts = result.componentBreakdown!.filter((e) => e.kind === "part");
    expect(parts).toHaveLength(2);

    const dec = parts.find((p) => p.partId === "part-dec")!;
    expect(dec.filamentSource).toBe("material");
    // 40g × R$200/kg = 8,0 filamento; +0,36 energia +2,4 deprec = 10,76;
    // +12,5% falha = 12,105.
    expect(dec.unitCost).toBeCloseTo(12.105, 6);
    expect(dec.totalCost).toBeCloseTo(12.105, 6);

    const cun = parts.find((p) => p.partId === "part-cun")!;
    expect(cun.filamentSource).toBe("global");
    // 8g × R$130/kg = 1,04; +0,06 +0,4 = 1,5; +12,5% = 1,6875; ×10 = 16,875.
    expect(cun.unitCost).toBeCloseTo(1.6875, 6);
    expect(cun.totalCost).toBeCloseTo(16.875, 6);

    expect(result.costBreakdown.packagingCost).toBe(PACKAGING_COST);
    expect(result.totalCost).toBeCloseTo(12.105 + 16.875 + PACKAGING_COST, 6);
    expect(result.weightGrams).toBeNull();
    expect(result.suggestedTier).toEqual({ ambiguous: false, tier: "G" });
  });

  it("agrega peça composta mista: parte inline + componente do catálogo, com uma única embalagem", async () => {
    const { service, priceCalculations } = makeService(makeCostParameters(), {
      products: [DECAGONO, MANDALA],
      materials: [PLA_VERMELHO],
      productComponents: [
        { id: "pc-1", parentProductId: "mandala", componentProductId: "decagono", quantity: 1, createdBy: null, createdAt: "2026-01-01" },
      ],
      productParts: [makePart({ id: "part-base", name: "Base", materialId: "mat-red", pieceGrams: 40, printHours: 3 })],
    });
    priceCalculations.saved.push(makeSavedCalculation("calc-decagono", 6.34));

    const result = await service.calculateCompositePrice({ productId: "mandala", chosenTier: "M", createdBy: null });

    expect(result.componentBreakdown!.some((e) => e.kind === "part")).toBe(true);
    expect(result.componentBreakdown!.some((e) => e.kind !== "part")).toBe(true);
    // Parte (12,105) + componente sem embalagem própria (6,34 − 0,317 = 6,023)
    // + 1 embalagem (3).
    expect(result.totalCost).toBeCloseTo(12.105 + (6.34 - 6.34 * 0.05) + PACKAGING_COST, 6);
    expect(result.costBreakdown.packagingCost).toBe(PACKAGING_COST);
  });

  it("rejeita peça composta sem partes nem componentes (composição vazia)", async () => {
    const { service } = makeService(makeCostParameters(), { products: [MANDALA] });

    await expect(
      service.calculateCompositePrice({ productId: "mandala", chosenTier: "M", createdBy: null }),
    ).rejects.toThrow(/vazia|partes|componentes/i);
  });
});

describe("classifyTier", () => {
  it("lança erro quando nenhuma faixa vigente cobre o peso/tempo informado", () => {
    expect(() => classifyTier(1000, 100, SIZE_TIER_RANGES, SIZE_TIERS_DEF)).toThrow();
  });

  it("classifica num porte personalizado quando peso e tempo caem na faixa dele", () => {
    // GG entre a faixa G e o infinito: 200g / 15h.
    const tiers: SizeTierDefinition[] = [
      ...SIZE_TIERS_DEF,
      { code: "GG", label: "Extra Grande", sortOrder: 40, isSystem: false, createdBy: null, createdAt: "2026-01-01" },
    ];
    const ranges: SizeTierRange[] = [
      ...SIZE_TIER_RANGES,
      { id: "t-gg", tier: "GG", minWeightGrams: 150, maxWeightGrams: 400, minPrintHours: 12, maxPrintHours: 30, validFrom: "2026-01-01", ...NO_TIER_MARGIN },
    ];

    expect(classifyTier(200, 15, ranges, tiers)).toEqual({ ambiguous: false, tier: "GG" });
  });

  it("ordena os candidatos ambíguos pela ordem cadastrada dos portes, não alfabética", () => {
    // Um porte personalizado XG com ordem ENTRE P e M (sortOrder 15). Peso cai
    // em XG, tempo cai em G → candidatos devem sair na ordem da régua: XG antes
    // de G, mesmo "XG" vindo depois de "G" no alfabeto.
    const tiers: SizeTierDefinition[] = [
      ...SIZE_TIERS_DEF,
      { code: "XG", label: "Médio-grande", sortOrder: 15, isSystem: false, createdBy: null, createdAt: "2026-01-01" },
    ];
    const ranges: SizeTierRange[] = [
      ...SIZE_TIER_RANGES,
      { id: "t-xg", tier: "XG", minWeightGrams: 16, maxWeightGrams: 18, minPrintHours: 0.1, maxPrintHours: 0.2, validFrom: "2026-01-01", ...NO_TIER_MARGIN },
    ];

    // 17g casa XG (peso) e P (peso 5-20); 8,4h casa G (tempo). Peso casa XG e P;
    // tempo casa G. União = P, XG, G → ordenada por sortOrder: P(10), XG(15), G(30).
    const result = classifyTier(17, 8.4, ranges, tiers);
    expect(result.ambiguous).toBe(true);
    if (result.ambiguous) {
      expect(result.candidates).toEqual(["P", "XG", "G"]);
    }
  });
});
