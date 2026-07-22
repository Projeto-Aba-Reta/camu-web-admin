import { describe, it, expect } from "vitest";
import type { CompositeBreakdownEntry } from "@/types/pricing";
import { isPartBreakdownEntry, resolveFilamentCostPerKg } from "./pricing-formula";

describe("resolveFilamentCostPerKg", () => {
  const GLOBAL = 130;

  it("usa o custo de referência direto quando o insumo é filamento em kg", () => {
    const result = resolveFilamentCostPerKg(
      { type: "filamento", unit: "kg", referenceCost: 200 },
      GLOBAL,
    );
    expect(result).toEqual({ costPerKg: 200, source: "material" });
  });

  it("converte g para kg (×1000) quando o insumo é filamento em g", () => {
    const result = resolveFilamentCostPerKg(
      { type: "filamento", unit: "g", referenceCost: 0.08 },
      GLOBAL,
    );
    expect(result.source).toBe("material");
    expect(result.costPerKg).toBeCloseTo(80, 6);
  });

  it("cai no preço global quando não há insumo vinculado", () => {
    expect(resolveFilamentCostPerKg(null, GLOBAL)).toEqual({ costPerKg: GLOBAL, source: "global" });
    expect(resolveFilamentCostPerKg(undefined, GLOBAL)).toEqual({ costPerKg: GLOBAL, source: "global" });
  });

  it("cai no preço global quando o insumo não é filamento", () => {
    const result = resolveFilamentCostPerKg(
      { type: "embalagem", unit: "unidade", referenceCost: 3 },
      GLOBAL,
    );
    expect(result).toEqual({ costPerKg: GLOBAL, source: "global" });
  });
});

describe("isPartBreakdownEntry (retrocompatibilidade de snapshot)", () => {
  // Snapshot salvo antes das partes inline: as entradas não têm `kind`.
  const SNAPSHOT_ANTIGO = [
    { componentProductId: "decagono", quantity: 1, unitCost: 6.34, totalCost: 6.34 },
    { componentProductId: "cunha", quantity: 10, unitCost: 1.5, totalCost: 15 },
  ] as unknown as CompositeBreakdownEntry[];

  it("lê entrada sem kind como componente do catálogo", () => {
    expect(SNAPSHOT_ANTIGO.every((entry) => !isPartBreakdownEntry(entry))).toBe(true);
    expect(SNAPSHOT_ANTIGO.filter(isPartBreakdownEntry)).toHaveLength(0);
  });

  it("não altera a entrada antiga ao lê-la", () => {
    const antes = JSON.stringify(SNAPSHOT_ANTIGO);
    SNAPSHOT_ANTIGO.forEach(isPartBreakdownEntry);
    expect(JSON.stringify(SNAPSHOT_ANTIGO)).toBe(antes);
    // Nenhum `kind` é escrito de volta no snapshot (snapshots são imutáveis).
    expect(SNAPSHOT_ANTIGO.every((entry) => !("kind" in entry))).toBe(true);
  });

  it("distingue parte inline de componente num breakdown misto", () => {
    const misto: CompositeBreakdownEntry[] = [
      ...SNAPSHOT_ANTIGO,
      { kind: "component", componentProductId: "base", quantity: 1, unitCost: 2, totalCost: 2 },
      {
        kind: "part",
        partId: "part-dec",
        name: "Decágono",
        quantity: 1,
        filamentSource: "material",
        materialId: "mat-red",
        unitFilamentCost: 8,
        unitEnergyCost: 0.36,
        unitDepreciationCost: 2.4,
        unitCost: 12.105,
        totalCost: 12.105,
      },
    ];

    const parts = misto.filter(isPartBreakdownEntry);
    expect(parts).toHaveLength(1);
    expect(parts[0].name).toBe("Decágono");
    expect(misto.filter((entry) => !isPartBreakdownEntry(entry))).toHaveLength(3);
  });
});
