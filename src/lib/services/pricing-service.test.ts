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
  ChannelFee,
  CostParameters,
  PriceCalculation,
  Printer,
  SizeTierRange,
} from "@/types/pricing";

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
    filamentCostPerKg: 90,
    energyCostPerKwh: 0.8,
    averagePowerWatts: 150,
    failureReservePct: 0.125,
    packagingCost: 3,
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

function makeService(costParameters: CostParameters) {
  const printers = new FakePrinterRepository([ENDER_3]);
  const channelFees = new FakeChannelFeeRepository([
    { id: "fee-ml", channel: "mercado_livre", percentageFee: 0.14, fixedFee: 0, validFrom: "2026-01-01", createdBy: null },
  ]);
  const sizeTierRanges = new FakeSizeTierRangeRepository(SIZE_TIER_RANGES);
  const priceCalculations = new FakePriceCalculationRepository();
  const costParametersRepo = new FakeCostParameterRepository(costParameters);

  const service = new PricingService({
    costParameters: costParametersRepo,
    printers,
    channelFees,
    sizeTierRanges,
    priceCalculations,
  });

  return { service, costParametersRepo, priceCalculations };
}

describe("PricingService.calculatePrice", () => {
  // Valores de referência de custo-por-peca.md: P ≈ R$7, M ≈ R$12, G ≈ R$32.
  // A fórmula deste motor (filamento + energia + depreciação + reserva +
  // embalagem) usa embalagem como parâmetro FLAT (não escalado por porte),
  // então a aproximação é mais fechada em P/M e mais folgada em G (peças G
  // do doc levam pós-processo/pintura, custo que este schema ainda não
  // modela por tier — ver Open Questions do design.md). Por isso a tolerância
  // usada aqui é de ordem de grandeza (dentro de 50% do valor de referência),
  // não uma igualdade exata.
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
    expect(result.totalCost).toBeLessThan(reference * 1.5);
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

  it("calcula preço sugerido e margem por canal ativo", async () => {
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

describe("classifyTier", () => {
  it("lança erro quando nenhuma faixa vigente cobre o peso/tempo informado", () => {
    expect(() => classifyTier(1000, 100, SIZE_TIER_RANGES)).toThrow();
  });
});
