import type { SizeTier, SizeTierDefinition } from "@/types/pricing";

// Resolve o rótulo de um porte a partir das definições cadastradas, no lugar
// dos Record<SizeTier,string> fixos que existiam quando os portes eram só
// P/M/G. Rótulo no formato "Nome (CÓDIGO)". Fallback para o próprio código
// quando o porte não estiver na lista — evita quebra de renderização de uma
// peça/cálculo cujo porte não veio carregado (não deve ocorrer, já que portes
// não somem, mas o fallback é barato).
export function tierLabel(code: SizeTier, tiers: SizeTierDefinition[]): string {
  const tier = tiers.find((t) => t.code === code);
  return tier ? `${tier.label} (${tier.code})` : code;
}

// Mapa code → rótulo, para quando várias linhas precisam do rótulo sem refazer
// o find a cada uma.
export function tierLabelMap(tiers: SizeTierDefinition[]): Map<SizeTier, string> {
  return new Map(tiers.map((tier) => [tier.code, `${tier.label} (${tier.code})`]));
}
