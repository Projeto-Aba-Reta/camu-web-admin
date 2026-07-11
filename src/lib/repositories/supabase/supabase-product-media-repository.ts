import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProductMedia } from "@/types/catalog";
import type {
  CreateProductMediaInput,
  IProductMediaRepository,
} from "../interfaces/product-media-repository.interface";

function toProductMedia(row: Database["public"]["Tables"]["product_media"]["Row"]): ProductMedia {
  return {
    id: row.id,
    productId: row.product_id,
    storagePath: row.storage_path,
    displayOrder: row.display_order,
    isCover: row.is_cover,
    createdAt: row.created_at,
  };
}

export class SupabaseProductMediaRepository implements IProductMediaRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<ProductMedia | null> {
    const { data, error } = await this.supabase.from("product_media").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toProductMedia(data) : null;
  }

  async findByProductId(productId: string): Promise<ProductMedia[]> {
    const { data, error } = await this.supabase
      .from("product_media")
      .select("*")
      .eq("product_id", productId)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toProductMedia);
  }

  async create(input: CreateProductMediaInput): Promise<ProductMedia> {
    const { data, error } = await this.supabase
      .from("product_media")
      .insert({
        product_id: input.productId,
        storage_path: input.storagePath,
        display_order: input.displayOrder,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toProductMedia(data);
  }

  async updateDisplayOrder(id: string, displayOrder: number): Promise<void> {
    const { error } = await this.supabase.from("product_media").update({ display_order: displayOrder }).eq("id", id);
    if (error) throw error;
  }

  async setCover(id: string, productId: string): Promise<void> {
    // Desmarca antes de marcar: evita colisão momentânea com o índice único
    // parcial (product_id) where is_cover — ver design.md decisão 3.
    const { error: clearError } = await this.supabase
      .from("product_media")
      .update({ is_cover: false })
      .eq("product_id", productId)
      .eq("is_cover", true);
    if (clearError) throw clearError;

    const { error: setError } = await this.supabase.from("product_media").update({ is_cover: true }).eq("id", id);
    if (setError) throw setError;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("product_media").delete().eq("id", id);
    if (error) throw error;
  }
}
