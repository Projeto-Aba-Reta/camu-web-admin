import type { ProductCategory, ProductStatus } from "@/types/catalog";
import type { SizeTier } from "@/types/pricing";

// Categorias seguem camu-docs/06-marketplace/estrategia-canais.md (ver
// proposal.md, Impact).
export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  miniatura_colecionavel: "Miniatura colecionável",
  personalizado: "Personalizado",
  utilitario: "Utilitário",
  linha_leon: "Linha Leon",
};

export const STATUS_LABEL: Record<ProductStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  inativo: "Inativo",
  descontinuado: "Descontinuado",
};

export const SIZE_TIER_LABEL: Record<SizeTier, string> = { P: "Pequena (P)", M: "Média (M)", G: "Grande (G)" };

// Referência de negócio fixa (ver design.md decisão 3 e
// camu-docs/02-roadmap/fase-4-assinatura-recorrente.md): 15-20 peças ativas
// por categoria antes da assinatura recorrente. Isolado aqui, não
// configurável pelo usuário nesta fase.
export const CATALOG_MATURITY_TARGET = 20;
