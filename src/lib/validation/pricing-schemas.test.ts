import { describe, it, expect } from "vitest";
import { sizeTierCodeSchema } from "./pricing-schemas";

describe("sizeTierCodeSchema", () => {
  it("normaliza o código (trim + maiúsculas)", () => {
    expect(sizeTierCodeSchema.parse(" gg ")).toBe("GG");
  });

  it("aceita códigos de 1 a 4 caracteres alfanuméricos", () => {
    for (const code of ["P", "GG", "XG", "P1", "MAXX"]) {
      expect(sizeTierCodeSchema.parse(code)).toBe(code);
    }
  });

  it("rejeita o caractere / (separador de porte ambíguo em suggested_tier)", () => {
    // Ver design.md, Decisão 4: o código nunca pode conter "/", senão a
    // serialização de ambiguidade "P/G" fica ambígua.
    expect(sizeTierCodeSchema.safeParse("P/G").success).toBe(false);
  });

  it("rejeita código vazio e código longo demais", () => {
    expect(sizeTierCodeSchema.safeParse("").success).toBe(false);
    expect(sizeTierCodeSchema.safeParse("ABCDE").success).toBe(false);
  });

  it("rejeita caracteres não alfanuméricos", () => {
    for (const code of ["G-", "P M", "@", "P."]) {
      expect(sizeTierCodeSchema.safeParse(code).success).toBe(false);
    }
  });
});
