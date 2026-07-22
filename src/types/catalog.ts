import type { MarketplaceChannel, SizeTier } from "@/types/pricing";

export type ProductCategory = "miniatura_colecionavel" | "personalizado" | "utilitario" | "linha_leon";

export type ProductStatus = "rascunho" | "ativo" | "inativo" | "descontinuado";

// simples: peça impressa única. composta: kit formado por outras peças do
// catálogo, referenciadas via ProductComponent (ver Requirement "Tipo de
// peça simples ou composta").
export type ProductType = "simples" | "composta";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  sizeTier: SizeTier | null;
  status: ProductStatus;
  productType: ProductType;
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
  channel: MarketplaceChannel;
  listedPrice: number;
  isActive: boolean;
  priceOverrideReason: string | null;
  createdAt: string;
  updatedAt: string;
}
