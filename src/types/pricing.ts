export type MarketplaceChannel = "mercado_livre" | "shopee" | "tiktok_shop" | "amazon" | "shein";

// Canal de venda da peça. Além dos marketplaces, a loja própria do site
// (`loja_propria`): a peça é publicada nela tendo uma listagem ativa desse
// canal, cujo listed_price é o preço do site. Fica de fora de
// MarketplaceChannel de propósito — não tem taxa de canal cadastrada nem
// preço sugerido emitido pelo motor.
export type SalesChannel = MarketplaceChannel | "loja_propria";

export const LOJA_PROPRIA_CHANNEL = "loja_propria" satisfies SalesChannel;

// Código de um porte de tamanho. Deixou de ser a união fechada "P" | "M" | "G"
// quando os portes passaram a ser cadastráveis (ver change
// faixas-de-porte-personalizadas): agora é um código livre (P/M/G ou
// personalizado como GG). O alias é mantido para as assinaturas continuarem
// legíveis; o conjunto válido é dado de runtime, não do tipo.
export type SizeTier = string;

// Definição de um porte: sua identidade (code), rótulo (label), posição na
// régua de tamanho (sortOrder) e se é um porte de sistema P/M/G (isSystem —
// não removível, código imutável).
export interface SizeTierDefinition {
  code: string;
  label: string;
  sortOrder: number;
  isSystem: boolean;
  createdBy: string | null;
  createdAt: string;
}

// Como a margem de lucro de uma faixa de porte se combina com a margem-alvo
// base: "somar" adiciona à base; "substituir" faz a do porte valer sozinha
// (ver Requirement "Modo de aplicação somar ou substituir").
export type MarginMode = "somar" | "substituir";

// Margem aplicada a um preço, com sua origem preservada: sem isso, o
// histórico registraria o preço sem registrar de onde veio a margem — e as
// faixas de porte são versionadas, então reconstruir depois exigiria
// arqueologia de valid_from.
export interface EffectiveMargin {
  // Margem-alvo B2C vigente (preço por canal) ou margem-alvo da faixa de
  // volume (preço B2B).
  basePct: number;
  tierMarginPct: number;
  mode: MarginMode;
  effectivePct: number;
}

export interface CostParameters {
  id: string;
  filamentCostPerKg: number;
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
  // Fração (0-1) de margem-alvo B2C aplicada sobre o custo antes da taxa de
  // canal. 0 preserva o preço de equilíbrio anterior a este parâmetro.
  targetMarginPct: number;
  validFrom: string;
  createdBy: string | null;
}

export interface B2bPricingTier {
  id: string;
  minQuantity: number;
  targetMarginPct: number;
  validFrom: string;
  createdBy: string | null;
}

export interface Printer {
  id: string;
  name: string;
  model: string;
  depreciationPerHour: number;
  isActive: boolean;
  validFrom: string;
  createdBy: string | null;
}

export interface ChannelFee {
  id: string;
  channel: MarketplaceChannel;
  percentageFee: number;
  fixedFee: number;
  validFrom: string;
  createdBy: string | null;
}

export interface SizeTierRange {
  id: string;
  tier: SizeTier;
  minWeightGrams: number;
  maxWeightGrams: number;
  minPrintHours: number;
  maxPrintHours: number;
  // Margem de lucro própria do porte, em fração (0-1), resolvida de forma
  // independente para B2C e B2B. 0 no modo "somar" preserva o preço anterior
  // à existência da margem por porte.
  b2cMarginPct: number;
  b2cMarginMode: MarginMode;
  b2bMarginPct: number;
  b2bMarginMode: MarginMode;
  validFrom: string;
}

export interface CostBreakdown {
  filamentCost: number;
  energyCost: number;
  depreciationCost: number;
  failureReserveCost: number;
  packagingCost: number;
}

export interface ChannelPrice {
  channel: MarketplaceChannel;
  suggestedPrice: number;
  margin: number;
}

// effectiveMargin é por faixa: a base é a margem-alvo daquela faixa de volume,
// então duas faixas do mesmo cálculo têm margens efetivas diferentes.
export interface B2bPrice {
  minQuantity: number;
  suggestedPrice: number;
  margin: number;
  effectiveMargin: EffectiveMargin;
}

// Origem do preço do filamento de uma parte: "material" quando derivado do
// insumo vinculado no estoque, "global" quando caiu no preço global por kg
// (parte sem insumo vinculado) — ver Requirement "Parte com filamento
// vinculado ao estoque de insumos".
export type FilamentSource = "material" | "global";

// Custo de um componente do catálogo dentro do cálculo agregado de uma peça
// composta (ver Requirement "Custo agregado de peça composta"). `kind` é
// ausente em snapshots salvos antes das partes inline — a leitura trata a
// ausência como "component" (ver design.md, Decisão 4).
export interface CompositeComponentCost {
  kind?: "component";
  componentProductId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

// Custo de uma parte inline dentro do cálculo agregado de uma peça composta.
// Guarda o breakdown por parte (filamento/energia/depreciação) e a origem do
// preço do filamento, para auditoria do snapshot.
export interface CompositePartCost {
  kind: "part";
  partId: string;
  name: string;
  quantity: number;
  filamentSource: FilamentSource;
  materialId: string | null;
  unitFilamentCost: number;
  unitEnergyCost: number;
  unitDepreciationCost: number;
  unitCost: number;
  totalCost: number;
}

// Uma entrada do component_breakdown de uma peça composta: parte inline ou
// componente do catálogo. Discriminada por `kind` ("part" vs ausente/
// "component").
export type CompositeBreakdownEntry = CompositePartCost | CompositeComponentCost;

// Porte sugerido: pode ser um único tier (encaixe claro) ou uma ambiguidade
// entre dois tiers candidatos, quando peso e tempo apontam para faixas
// diferentes (ver Requirement "Classificação automática de porte P/M/G").
// null só aparece em cálculos salvos antes da margem por porte — hoje todo
// cálculo salvo exige um porte resolvido (ver Requirement "Porte resolvido é
// obrigatório para salvar um cálculo").
export type SuggestedTier =
  | { ambiguous: false; tier: SizeTier }
  | { ambiguous: true; candidates: SizeTier[] };

export interface PriceCalculationInput {
  // Omitir weightGrams/printHours quando productId tiver ficha de fatiamento
  // cadastrada para printerId — o motor deriva os dois valores da ficha (ver
  // Requirement "Cálculo a partir de uma ficha de fatiamento cadastrada").
  weightGrams?: number;
  printHours?: number;
  printerId: string;
  productId?: string;
  // Porte escolhido manualmente para desfazer uma ambiguidade entre faixas.
  // Vence a classificação automática e define a margem aplicada.
  chosenTier?: SizeTier;
  createdBy: string | null;
}

// chosenTier é obrigatório: uma peça composta não tem um único peso/tempo a
// classificar, e sem porte não há margem a aplicar (ver design.md, Decisão 3).
export interface CalculateCompositePriceInput {
  productId: string;
  chosenTier: SizeTier;
  createdBy: string | null;
}

export interface PriceCalculationResult {
  weightGrams: number | null;
  printHours: number | null;
  printerId: string | null;
  productId: string | null;
  slicingSheetId: string | null;
  costParametersId: string;
  suggestedTier: SuggestedTier | null;
  totalCost: number;
  costBreakdown: CostBreakdown;
  channelPrices: ChannelPrice[];
  b2bPrices: B2bPrice[];
  componentBreakdown: CompositeBreakdownEntry[] | null;
  // Margem efetiva usada em todos os channelPrices (a base é a mesma para
  // todos os canais — o que varia entre canais é a taxa, não a margem).
  // null nos cálculos salvos antes da margem por porte, que não são
  // recalculados nem migrados.
  effectiveB2cMargin: EffectiveMargin | null;
}

export interface PriceCalculation extends PriceCalculationResult {
  id: string;
  createdBy: string | null;
  createdAt: string;
}
