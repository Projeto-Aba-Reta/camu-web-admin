import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MaterialStockThreshold } from "@/types/inventory";
import type {
  IMaterialStockThresholdRepository,
  UpsertMaterialStockThresholdInput,
} from "../interfaces/material-stock-threshold-repository.interface";

function toThreshold(
  row: Database["public"]["Tables"]["material_stock_thresholds"]["Row"],
): MaterialStockThreshold {
  return {
    id: row.id,
    materialId: row.material_id,
    minimumQuantity: row.minimum_quantity,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export class SupabaseMaterialStockThresholdRepository implements IMaterialStockThresholdRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByMaterialId(materialId: string): Promise<MaterialStockThreshold | null> {
    const { data, error } = await this.supabase
      .from("material_stock_thresholds")
      .select("*")
      .eq("material_id", materialId)
      .maybeSingle();
    if (error) throw error;
    return data ? toThreshold(data) : null;
  }

  async findAll(): Promise<MaterialStockThreshold[]> {
    const { data, error } = await this.supabase.from("material_stock_thresholds").select("*");
    if (error) throw error;
    return (data ?? []).map(toThreshold);
  }

  async upsert(input: UpsertMaterialStockThresholdInput): Promise<MaterialStockThreshold> {
    const { data, error } = await this.supabase
      .from("material_stock_thresholds")
      .upsert(
        {
          material_id: input.materialId,
          minimum_quantity: input.minimumQuantity,
          updated_by: input.updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "material_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toThreshold(data);
  }
}
