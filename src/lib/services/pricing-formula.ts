import type {
  B2bPrice,
  CompositeBreakdownEntry,
  CompositePartCost,
  CostBreakdown,
  EffectiveMargin,
  FilamentSource,
  MarginMode,
  MarketplaceChannel,
  SizeTier,
  SizeTierDefinition,
  SizeTierRange,
  SuggestedTier,
} from "@/types/pricing";

// Fórmula de precificação, isolada em funções puras (sem repositório, sem
// async) para que o motor (servidor) e o simulador (cliente) rodem
// exatamente o mesmo código. Uma segunda implementação da fórmula na UI
// divergiria do motor no primeiro ajuste — ver design.md, Decisão 4.

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Ordem dos portes na régua de tamanho, vinda do dado (size_tiers.sort_order)
// em vez de uma constante fixa P/M/G — os portes são cadastráveis (ver change
// faixas-de-porte-personalizadas). Desempate estável por código quando duas
// ordens colidem.
export function orderTierCodes(tiers: SizeTierDefinition[]): SizeTier[] {
  return [...tiers]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    .map((tier) => tier.code);
}

// Classifica o porte comparando peso e tempo contra as faixas vigentes.
// Se um único tier casa com peso E tempo simultaneamente, a classificação é
// direta. Caso contrário, junta os candidatos que casam por peso e por
// tempo separadamente: se sobrar exatamente um, ainda é uma classificação
// confiável (só um dos dois sinais bateu numa faixa); se sobrar mais de um,
// sinaliza ambiguidade sem escolher automaticamente (ver Requirement
// "Classificação automática de porte P/M/G"). A ordem dos candidatos vem da
// ordem cadastrada dos portes, não de uma sequência fixa.
export function classifyTier(
  weightGrams: number,
  printHours: number,
  ranges: SizeTierRange[],
  tiers: SizeTierDefinition[],
): SuggestedTier {
  const order = orderTierCodes(tiers);
  const rank = new Map(order.map((code, index) => [code, index]));
  const byRank = (a: SizeTier, b: SizeTier) =>
    (rank.get(a) ?? Number.POSITIVE_INFINITY) - (rank.get(b) ?? Number.POSITIVE_INFINITY) || a.localeCompare(b);

  const weightMatches = ranges.filter((r) => inRange(weightGrams, r.minWeightGrams, r.maxWeightGrams));
  const timeMatches = ranges.filter((r) => inRange(printHours, r.minPrintHours, r.maxPrintHours));

  const weightTiers = new Set(weightMatches.map((r) => r.tier));
  const timeTiers = new Set(timeMatches.map((r) => r.tier));

  const both = [...weightTiers].filter((tier) => timeTiers.has(tier)).sort(byRank);
  if (both.length === 1) return { ambiguous: false, tier: both[0] };

  const union = [...new Set([...weightTiers, ...timeTiers])].sort(byRank);
  if (union.length === 1) return { ambiguous: false, tier: union[0] };
  if (union.length === 0) {
    throw new Error(
      "Não há faixa de porte vigente que se aplique a este peso/tempo — cadastre faixas de referência antes de calcular.",
    );
  }
  return { ambiguous: true, candidates: union };
}

export function findTierRange(ranges: SizeTierRange[], tier: SizeTier): SizeTierRange | null {
  return ranges.find((range) => range.tier === tier) ?? null;
}

// Custo por kg de filamento resolvido a partir do insumo do estoque vinculado,
// com fallback ao preço global — ver Requirement "Custo por kg de filamento
// disponível para o motor de cálculo". O insumo de filamento tem unidade kg ou
// g (garantido por constraint), então o custo por kg é sempre derivável: kg usa
// o custo de referência direto, g multiplica por 1000. Qualquer outra situação
// (sem insumo, insumo que não é filamento) cai no preço global.
export function resolveFilamentCostPerKg(
  material: { type: string; unit: string; referenceCost: number } | null | undefined,
  globalCostPerKg: number,
): { costPerKg: number; source: FilamentSource } {
  if (material && material.type === "filamento") {
    if (material.unit === "kg") return { costPerKg: material.referenceCost, source: "material" };
    if (material.unit === "g") return { costPerKg: material.referenceCost * 1000, source: "material" };
  }
  return { costPerKg: globalCostPerKg, source: "global" };
}

// Discrimina uma entrada de component_breakdown. Snapshots salvos antes das
// partes inline não têm `kind`: a ausência é lida como componente do catálogo
// (ver design.md, Decisão 4). Snapshots são imutáveis — nunca reescreva a
// entrada antiga para incluir `kind`.
export function isPartBreakdownEntry(entry: CompositeBreakdownEntry): entry is CompositePartCost {
  return entry.kind === "part";
}

interface MachineCostParameters {
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
}

// Núcleo do custo a partir de um custo de filamento já resolvido (por linha de
// material / insumo). calculateCostBreakdown é o caso "peso × preço global".
export function calculateCostBreakdownFromFilament(
  filamentCost: number,
  printHours: number,
  depreciationPerHour: number,
  costParameters: MachineCostParameters,
): CostBreakdown {
  const energyCost = printHours * (costParameters.averagePowerWatts / 1000) * costParameters.energyCostPerKwh;
  const depreciationCost = printHours * depreciationPerHour;
  const subtotal = filamentCost + energyCost + depreciationCost;
  const failureReserveCost = subtotal * costParameters.failureReservePct;
  const packagingCost = costParameters.packagingCost;

  return { filamentCost, energyCost, depreciationCost, failureReserveCost, packagingCost };
}

export function calculateCostBreakdown(
  weightGrams: number,
  printHours: number,
  depreciationPerHour: number,
  costParameters: MachineCostParameters & { filamentCostPerKg: number },
): CostBreakdown {
  const filamentCost = (weightGrams / 1000) * costParameters.filamentCostPerKg;
  return calculateCostBreakdownFromFilament(filamentCost, printHours, depreciationPerHour, costParameters);
}

// Custo de uma unidade de uma parte inline de peça composta: filamento +
// energia + depreciação + reserva de falha (por peça impressa — ver Requirement
// "Custo agregado de peça composta"). Sem embalagem: a embalagem é contada uma
// única vez no conjunto, não por parte.
export function calculatePartUnitCost(
  filamentCost: number,
  printHours: number,
  depreciationPerHour: number,
  costParameters: Pick<MachineCostParameters, "energyCostPerKwh" | "averagePowerWatts" | "failureReservePct">,
): Pick<CostBreakdown, "filamentCost" | "energyCost" | "depreciationCost" | "failureReserveCost"> {
  const energyCost = printHours * (costParameters.averagePowerWatts / 1000) * costParameters.energyCostPerKwh;
  const depreciationCost = printHours * depreciationPerHour;
  const subtotal = filamentCost + energyCost + depreciationCost;
  const failureReserveCost = subtotal * costParameters.failureReservePct;
  return { filamentCost, energyCost, depreciationCost, failureReserveCost };
}

export function sumCostBreakdown(breakdown: CostBreakdown): number {
  return (
    breakdown.filamentCost +
    breakdown.energyCost +
    breakdown.depreciationCost +
    breakdown.failureReserveCost +
    breakdown.packagingCost
  );
}

export function addWeightedBreakdown(target: CostBreakdown, addend: CostBreakdown, weight: number): void {
  target.filamentCost += addend.filamentCost * weight;
  target.energyCost += addend.energyCost * weight;
  target.depreciationCost += addend.depreciationCost * weight;
  target.failureReserveCost += addend.failureReserveCost * weight;
  target.packagingCost += addend.packagingCost * weight;
}

// Margem efetiva: "somar" adiciona a margem do porte à margem-alvo base;
// "substituir" faz a do porte valer sozinha, ignorando a base. A soma é
// aditiva em pontos percentuais (15% + 20% = 35%, não 38%) — o precificador
// raciocina somando, e a composição multiplicativa surpreenderia (ver
// design.md, Decisão 2).
export function resolveEffectiveMargin(
  basePct: number,
  tierMarginPct: number,
  mode: MarginMode,
): EffectiveMargin {
  const effectivePct = mode === "substituir" ? tierMarginPct : basePct + tierMarginPct;
  return { basePct, tierMarginPct, mode, effectivePct };
}

// Faixa de porte legada (cadastrada antes da margem por porte) chega sem
// margem: 0 no modo "somar" preserva exatamente o preço anterior.
export function resolveB2cMargin(targetMarginPct: number, range: SizeTierRange | null): EffectiveMargin {
  return resolveEffectiveMargin(targetMarginPct, range?.b2cMarginPct ?? 0, range?.b2cMarginMode ?? "somar");
}

// A base do B2B é a margem-alvo da faixa de volume, nunca a margem-alvo B2C
// (ver Requirement "Base B2B é a margem da faixa de volume").
export function resolveB2bMargin(volumeTargetMarginPct: number, range: SizeTierRange | null): EffectiveMargin {
  return resolveEffectiveMargin(
    volumeTargetMarginPct,
    range?.b2bMarginPct ?? 0,
    range?.b2bMarginMode ?? "somar",
  );
}

// Preço sugerido por canal: (custo × (1 + margem efetiva)) ÷ (1 - percentual
// da taxa) + taxa fixa. Com margem efetiva 0, é exatamente o preço de
// equilíbrio — cobre custo + taxas do canal, sem margem embutida.
export function calculateChannelPrice(
  totalCost: number,
  effectiveMargin: EffectiveMargin,
  percentageFee: number,
  fixedFee: number,
): { suggestedPrice: number; margin: number } {
  if (percentageFee >= 1) {
    throw new Error(
      "Taxa percentual de canal igual ou maior que 100% — nenhum preço cobre o custo. Revise a taxa do canal.",
    );
  }
  const costWithMargin = totalCost * (1 + effectiveMargin.effectivePct);
  const suggestedPrice = costWithMargin / (1 - percentageFee) + fixedFee;
  const netRevenue = suggestedPrice * (1 - percentageFee) - fixedFee;
  const margin = netRevenue - totalCost;
  return { suggestedPrice, margin };
}

// Preço B2B por faixa de volume: custo × (1 + margem efetiva B2B), sem taxa
// de canal — não há intermediário de marketplace na venda B2B.
export function calculateB2bPrice(
  totalCost: number,
  minQuantity: number,
  effectiveMargin: EffectiveMargin,
): B2bPrice {
  const suggestedPrice = totalCost * (1 + effectiveMargin.effectivePct);
  return {
    minQuantity,
    suggestedPrice,
    margin: suggestedPrice - totalCost,
    effectiveMargin,
  };
}

// ---------------------------------------------------------------------------
// Fórmula expandida para exibição (simulador)
// ---------------------------------------------------------------------------

// Os passos carregam números, não texto formatado: a UI formata (R$, %,
// pt-BR), ela não recalcula. `template` referencia `terms` por índice.
export type FormulaTermKind = "currency" | "percent";

export interface FormulaTerm {
  label: string;
  value: number;
  kind: FormulaTermKind;
}

export interface FormulaStep {
  id: string;
  title: string;
  terms: FormulaTerm[];
  template: string;
  result: FormulaTerm;
}

export interface FormulaInput {
  costBreakdown: CostBreakdown;
  totalCost: number;
  effectiveB2cMargin: EffectiveMargin;
  channels: Array<{
    channel: MarketplaceChannel;
    percentageFee: number;
    fixedFee: number;
    suggestedPrice: number;
  }>;
  b2bPrices: B2bPrice[];
}

function marginStep(id: string, title: string, margin: EffectiveMargin, baseLabel: string): FormulaStep {
  const substitui = margin.mode === "substituir";
  return {
    id,
    title,
    terms: substitui
      ? [{ label: "margem do porte", value: margin.tierMarginPct, kind: "percent" }]
      : [
          { label: baseLabel, value: margin.basePct, kind: "percent" },
          { label: "margem do porte", value: margin.tierMarginPct, kind: "percent" },
        ],
    // No modo "substituir" a base não entra na conta — o template deixa isso
    // visível em vez de exibir uma soma que não aconteceu.
    template: substitui ? "{0}" : "{0} + {1}",
    result: { label: "margem efetiva", value: margin.effectivePct, kind: "percent" },
  };
}

export function buildFormulaSteps(input: FormulaInput): FormulaStep[] {
  const { costBreakdown, totalCost, effectiveB2cMargin, channels, b2bPrices } = input;

  const steps: FormulaStep[] = [
    {
      id: "custo",
      title: "Custo total",
      terms: [
        { label: "filamento", value: costBreakdown.filamentCost, kind: "currency" },
        { label: "energia", value: costBreakdown.energyCost, kind: "currency" },
        { label: "depreciação", value: costBreakdown.depreciationCost, kind: "currency" },
        { label: "reserva p/ falha", value: costBreakdown.failureReserveCost, kind: "currency" },
        { label: "embalagem", value: costBreakdown.packagingCost, kind: "currency" },
      ],
      template: "{0} + {1} + {2} + {3} + {4}",
      result: { label: "custo total", value: totalCost, kind: "currency" },
    },
    marginStep("margem-b2c", "Margem efetiva B2C", effectiveB2cMargin, "margem-alvo B2C"),
  ];

  for (const channel of channels) {
    steps.push({
      id: `canal-${channel.channel}`,
      title: channel.channel,
      terms: [
        { label: "custo total", value: totalCost, kind: "currency" },
        { label: "margem efetiva", value: effectiveB2cMargin.effectivePct, kind: "percent" },
        { label: "taxa do canal", value: channel.percentageFee, kind: "percent" },
        { label: "taxa fixa", value: channel.fixedFee, kind: "currency" },
      ],
      template: "{0} × (1 + {1}) ÷ (1 − {2}) + {3}",
      result: { label: "preço sugerido", value: channel.suggestedPrice, kind: "currency" },
    });
  }

  for (const price of b2bPrices) {
    steps.push(
      marginStep(
        `margem-b2b-${price.minQuantity}`,
        `Margem efetiva B2B — ${price.minQuantity}+ un.`,
        price.effectiveMargin,
        "margem-alvo da faixa",
      ),
    );
    steps.push({
      id: `b2b-${price.minQuantity}`,
      // Sem taxa de canal: não há intermediário de marketplace na venda B2B.
      title: `Preço B2B — ${price.minQuantity}+ un.`,
      terms: [
        { label: "custo total", value: totalCost, kind: "currency" },
        { label: "margem efetiva", value: price.effectiveMargin.effectivePct, kind: "percent" },
      ],
      template: "{0} × (1 + {1})",
      result: { label: "preço sugerido", value: price.suggestedPrice, kind: "currency" },
    });
  }

  return steps;
}
