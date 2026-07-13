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
