import type { SalesChannel, SizeTier } from "@/types/pricing";

export type ProductCategory = "miniatura_colecionavel" | "personalizado" | "utilitario" | "linha_leon";

export type ProductStatus = "rascunho" | "ativo" | "inativo" | "descontinuado";

// simples: peça impressa única. composta: kit formado por outras peças do
// catálogo, referenciadas via ProductComponent (ver Requirement "Tipo de
// peça simples ou composta").
export type ProductType = "simples" | "composta";

export interface Product {
  id: string;
  name: string;
  // Identificador da peça na URL da loja do site. Único e estável — trocar
  // quebra links já publicados (ver capability catalogo-de-pecas).
  slug: string;
  description: string | null;
  category: ProductCategory;
  sizeTier: SizeTier | null;
  status: ProductStatus;
  productType: ProductType;
  // Prazo de produção estimado exibido na loja como "feito sob encomenda ·
  // X-Y dias". Nulos => a loja mostra só "feito sob encomenda".
  productionLeadDaysMin: number | null;
  productionLeadDaysMax: number | null;
  priceCalculationId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductComponent {
  id: string;
  parentProductId: string;
  componentProductId: string;
  quantity: number;
  createdBy: string | null;
  createdAt: string;
}

// Parte inline (não vendável) de uma peça composta: carrega filamento, gramas,
// impressora e tempo próprios, diferente de ProductComponent (que referencia
// uma peça vendável do catálogo). materialId nulo => custo de filamento pelo
// preço global (fallback) — ver Requirement "Cadastro de parte inline de peça
// composta".
export interface PiecePart {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  materialId: string | null;
  pieceGrams: number;
  supportGrams: number;
  printerId: string;
  printHours: number;
  position: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMedia {
  id: string;
  productId: string;
  storagePath: string;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface ProductChannelListing {
  id: string;
  productId: string;
  channel: SalesChannel;
  listedPrice: number;
  isActive: boolean;
  priceOverrideReason: string | null;
  createdAt: string;
  updatedAt: string;
}
