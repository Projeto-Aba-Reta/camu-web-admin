import type { MarketplaceChannel, SizeTier } from "@/types/pricing";

export type ProductCategory = "miniatura_colecionavel" | "personalizado" | "utilitario" | "linha_leon";

export type ProductStatus = "rascunho" | "ativo" | "inativo" | "descontinuado";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  sizeTier: SizeTier | null;
  status: ProductStatus;
  priceCalculationId: string | null;
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
