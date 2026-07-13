import type { Product, ProductCategory, ProductStatus, ProductType } from "@/types/catalog";
import type { SizeTier } from "@/types/pricing";

export interface CreateProductInput {
  name: string;
  description: string | null;
  category: ProductCategory;
  productType?: ProductType;
  createdBy: string | null;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  category?: ProductCategory;
  sizeTier?: SizeTier | null;
  status?: ProductStatus;
  productType?: ProductType;
  priceCalculationId?: string | null;
}

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  delete(id: string): Promise<void>;
}
