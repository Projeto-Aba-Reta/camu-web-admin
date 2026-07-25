import { describe, it, expect, beforeEach } from "vitest";
import { SalesResultService, resolveMonthRange } from "./sales-result-service";
import { FakeSaleOriginRepository, FakeSalesResultRepository } from "./sales-fakes";

describe("resolveMonthRange", () => {
  it("usa 13 meses (12 encerrados + o corrente) quando não há período informado", () => {
    const { fromMonth, toMonth } = resolveMonthRange(undefined, undefined);
    const [fromYear, fromMonthPart] = fromMonth.split("-").map(Number);
    const [toYear, toMonthPart] = toMonth.split("-").map(Number);
    const span = toYear * 12 + toMonthPart - (fromYear * 12 + fromMonthPart);

    expect(span).toBe(12);
  });

  it("respeita o período informado", () => {
    expect(resolveMonthRange("2026-01", "2026-06")).toEqual({
      fromMonth: "2026-01",
      toMonth: "2026-06",
    });
  });

  it("ignora intervalo invertido e volta ao padrão", () => {
    const inverted = resolveMonthRange("2026-06", "2026-01");
    const fallback = resolveMonthRange(undefined, undefined);
    expect(inverted).toEqual(fallback);
  });

  it("ignora mês malformado", () => {
    const invalid = resolveMonthRange("2026-13", "2026-06");
    const fallback = resolveMonthRange(undefined, undefined);
    expect(invalid).toEqual(fallback);
  });
});

describe("SalesResultService", () => {
  let results: FakeSalesResultRepository;
  let origins: FakeSaleOriginRepository;
  let service: SalesResultService;

  beforeEach(() => {
    results = new FakeSalesResultRepository();
    origins = new FakeSaleOriginRepository();

    origins.seed({ id: "origin-boca", name: "Boca-a-boca", slug: "boca_a_boca" });
    origins.seed({ id: "origin-ml", name: "Mercado Livre", slug: "mercado_livre" });
    origins.seed({ id: "origin-shein", name: "SHEIN", slug: "shein", isActive: false });

    service = new SalesResultService({ salesResults: results, saleOrigins: origins });
  });

  it("agrega receita, gasto e lucro do mês somando as origens", async () => {
    results.rows = [
      { month: "2026-03-01", saleOriginId: "origin-boca", revenueCents: 20000, costCents: 8000, profitCents: 12000, orderCount: 2 },
      { month: "2026-03-01", saleOriginId: "origin-ml", revenueCents: 10000, costCents: 3000, profitCents: 7000, orderCount: 1 },
    ];

    const result = await service.getResult("2026-03", "2026-03");
    expect(result.series).toHaveLength(1);
    expect(result.series[0]).toMatchObject({
      month: "2026-03",
      revenueCents: 30000,
      costCents: 11000,
      profitCents: 19000,
      orderCount: 3,
    });
  });

  it("preenche com zeros os meses sem pedido para não abrir buraco no gráfico", async () => {
    results.rows = [
      { month: "2026-01-01", saleOriginId: "origin-ml", revenueCents: 5000, costCents: 1000, profitCents: 4000, orderCount: 1 },
      { month: "2026-03-01", saleOriginId: "origin-ml", revenueCents: 7000, costCents: 2000, profitCents: 5000, orderCount: 1 },
    ];

    const result = await service.getResult("2026-01", "2026-03");
    expect(result.series.map((point) => point.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(result.series[1]).toMatchObject({ revenueCents: 0, costCents: 0, orderCount: 0 });
  });

  it("reporta lucro negativo quando o gasto supera a receita", async () => {
    results.rows = [
      { month: "2026-05-01", saleOriginId: "origin-ml", revenueCents: 4000, costCents: 9000, profitCents: -5000, orderCount: 1 },
    ];

    const result = await service.getResult("2026-05", "2026-05");
    expect(result.series[0].profitCents).toBe(-5000);
    expect(result.totals.profitCents).toBe(-5000);
  });

  it("calcula a margem do período", async () => {
    results.rows = [
      { month: "2026-04-01", saleOriginId: "origin-ml", revenueCents: 100000, costCents: 40000, profitCents: 60000, orderCount: 4 },
    ];

    const result = await service.getResult("2026-04", "2026-04");
    expect(result.totals.profitCents).toBe(60000);
    expect(result.totals.marginPercent).toBe(60);
  });

  it("reporta margem indisponível quando a receita é zero", async () => {
    const result = await service.getResult("2026-04", "2026-04");
    expect(result.totals.revenueCents).toBe(0);
    expect(result.totals.marginPercent).toBeNull();
  });

  it("quebra o período por origem, incluindo as arquivadas com pedidos", async () => {
    results.rows = [
      { month: "2026-02-01", saleOriginId: "origin-boca", revenueCents: 30000, costCents: 10000, profitCents: 20000, orderCount: 3 },
      { month: "2026-02-01", saleOriginId: "origin-shein", revenueCents: 5000, costCents: 2000, profitCents: 3000, orderCount: 1 },
    ];

    const result = await service.getResult("2026-02", "2026-02");
    const shein = result.byOrigin.find((row) => row.saleOriginId === "origin-shein");

    expect(result.byOrigin).toHaveLength(2);
    expect(shein?.originIsActive).toBe(false);
    // Ordenado por receita: boca-a-boca (R$300) antes de SHEIN (R$50).
    expect(result.byOrigin[0].saleOriginId).toBe("origin-boca");
  });

  it("exibe pedido sem origem gravada como loja própria", async () => {
    results.rows = [
      { month: "2026-02-01", saleOriginId: null, revenueCents: 9000, costCents: 0, profitCents: 9000, orderCount: 1 },
    ];

    const result = await service.getResult("2026-02", "2026-02");
    expect(result.byOrigin[0].originName).toBe("Loja própria");
  });
});
