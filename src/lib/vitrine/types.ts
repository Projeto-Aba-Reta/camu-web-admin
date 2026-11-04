export type StoreProductStatus = "rascunho" | "publicado" | "arquivado";
export type StoreFulfillment = "sob_encomenda" | "pronta_entrega";

export const BADGE_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "mais_vendido", label: "Mais vendido" },
  { value: "edicao_limitada", label: "Edição limitada" },
  { value: "presente", label: "Ideia de presente" },
] as const;

export const STATUS_LABEL: Record<StoreProductStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export interface StoreMedia {
  id: string;
  storagePath: string;
  position: number;
  altText: string | null;
}

export interface StoreVariant {
  id: string;
  label: string;
  priceDeltaCents: number;
  position: number;
  active: boolean;
}

export interface StoreProduct {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  status: StoreProductStatus;
  category: string | null;
  badges: string[];
  highlights: string[];
  fulfillment: StoreFulfillment;
  leadDaysMin: number | null;
  leadDaysMax: number | null;
  featuredRank: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface StoreProductDetail extends StoreProduct {
  media: StoreMedia[];
  variants: StoreVariant[];
}

export interface StoreProductInput {
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  category: string | null;
  badges: string[];
  highlights: string[];
  fulfillment: StoreFulfillment;
  leadDaysMin: number | null;
  leadDaysMax: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface StoreReadiness {
  ok: boolean;
  missing: string[];
  tips: string[];
}

/** Publicar exige só título, 1 foto e preço > 0; o resto vira dica. */
export function evaluateReadiness(p: {
  title: string;
  priceCents: number;
  mediaCount: number;
  description: string | null;
  highlights: string[];
  leadDaysMin: number | null;
  leadDaysMax: number | null;
}): StoreReadiness {
  const missing: string[] = [];
  if (!p.title.trim()) missing.push("título");
  if (p.mediaCount < 1) missing.push("ao menos 1 foto");
  if (p.priceCents <= 0) missing.push("preço maior que zero");

  const tips: string[] = [];
  if (p.mediaCount > 0 && p.mediaCount < 3) tips.push("Use 3 ou mais fotos para converter melhor.");
  if ((p.description ?? "").trim().length < 80) tips.push("Descrição com mais de 80 caracteres ajuda no SEO.");
  if (p.highlights.length < 3) tips.push("Adicione 3 a 5 destaques (bullets).");
  if (p.leadDaysMin == null && p.leadDaysMax == null) tips.push("Informe o prazo de produção.");
  return { ok: missing.length === 0, missing, tips };
}
