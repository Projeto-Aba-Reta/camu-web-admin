import type { Product, ProductCategory, ProductStatus, ProductType } from "@/types/catalog";
import type { SizeTier } from "@/types/pricing";

export interface CreateProductInput {
  name: string;
  // Resolvido pelo CatalogService (gerado do nome e desambiguado) antes de
  // chegar aqui — o repositório não inventa slug.
  slug: string;
  description: string | null;
  category: ProductCategory;
  productType?: ProductType;
  productionLeadDaysMin?: number | null;
  productionLeadDaysMax?: number | null;
  createdBy: string | null;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string | null;
  category?: ProductCategory;
  sizeTier?: SizeTier | null;
  status?: ProductStatus;
  productType?: ProductType;
  productionLeadDaysMin?: number | null;
  productionLeadDaysMax?: number | null;
  priceCalculationId?: string | null;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  delete(id: string): Promise<void>;
}
