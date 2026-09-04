import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PetMiniatureRequest } from "@/types/pet-miniature";
import type { IPetMiniatureRequestRepository } from "../interfaces/pet-miniature-request-repository.interface";

type Row = Database["public"]["Tables"]["pet_miniature_requests"]["Row"];

function toRequest(row: Row): PetMiniatureRequest {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    photoPaths: row.photo_paths,
    status: row.status as PetMiniatureRequest["status"],
    generatedImagePaintedPath: row.generated_image_painted_path,
    generatedImagePlainPath: row.generated_image_plain_path,
    selectedVariant: row.selected_variant as PetMiniatureRequest["selectedVariant"],
    aiError: row.ai_error,
    orderId: row.order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabasePetMiniatureRequestRepository implements IPetMiniatureRequestRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(): Promise<PetMiniatureRequest[]> {
    const { data, error } = await this.supabase
      .from("pet_miniature_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toRequest);
  }
}
