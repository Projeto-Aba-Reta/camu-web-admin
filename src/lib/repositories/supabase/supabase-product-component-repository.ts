import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProductComponent } from "@/types/catalog";
import type {
  CreateProductComponentInput,
  IProductComponentRepository,
} from "../interfaces/product-component-repository.interface";

function toProductComponent(
  row: Database["public"]["Tables"]["product_components"]["Row"],
): ProductComponent {
  return {
    id: row.id,
    parentProductId: row.parent_product_id,
    componentProductId: row.component_product_id,
    quantity: row.quantity,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseProductComponentRepository implements IProductComponentRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByParentId(parentProductId: string): Promise<ProductComponent[]> {
    const { data, error } = await this.supabase
      .from("product_components")
      .select("*")
      .eq("parent_product_id", parentProductId);
    if (error) throw error;
    return (data ?? []).map(toProductComponent);
  }

  async findAllByParentIds(parentProductIds: string[]): Promise<ProductComponent[]> {
    if (parentProductIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from("product_components")
      .select("*")
      .in("parent_product_id", parentProductIds);
    if (error) throw error;
    return (data ?? []).map(toProductComponent);
  }

  async create(input: CreateProductComponentInput): Promise<ProductComponent> {
    const { data, error } = await this.supabase
      .from("product_components")
      .insert({
        parent_product_id: input.parentProductId,
        component_product_id: input.componentProductId,
        quantity: input.quantity,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toProductComponent(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from("product_components").delete().eq("id", id);
    if (error) throw error;
  }
}
