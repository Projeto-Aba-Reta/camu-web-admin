import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Product, ProductCategory, ProductStatus } from "@/types/catalog";
import type { SizeTier } from "@/types/pricing";
import type {
  CreateProductInput,
  IProductRepository,
  UpdateProductInput,
} from "../interfaces/product-repository.interface";

function toProduct(row: Database["public"]["Tables"]["products"]["Row"]): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as ProductCategory,
    sizeTier: row.size_tier as SizeTier | null,
    status: row.status as ProductStatus,
    priceCalculationId: row.price_calculation_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseProductRepository implements IProductRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toProduct(data) : null;
  }

  async findAll(): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toProduct);
  }

  async create(input: CreateProductInput): Promise<Product> {
    const { data, error } = await this.supabase
      .from("products")
      .insert({
        name: input.name,
        description: input.description,
        category: input.category,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toProduct(data);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const { data, error } = await this.supabase
      .from("products")
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.sizeTier !== undefined && { size_tier: input.sizeTier }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priceCalculationId !== undefined && { price_calculation_id: input.priceCalculationId }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toProduct(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  }
}
