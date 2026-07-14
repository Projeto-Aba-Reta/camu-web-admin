import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MaterialStockMovement } from "@/types/inventory";
import type {
  CreateMaterialStockMovementInput,
  IMaterialStockMovementRepository,
  MaterialStockBalance,
} from "../interfaces/material-stock-movement-repository.interface";

function toMovement(
  row: Database["public"]["Tables"]["material_stock_movements"]["Row"],
): MaterialStockMovement {
  return {
    id: row.id,
    materialId: row.material_id,
    quantity: row.quantity,
    movementType: row.movement_type as MaterialStockMovement["movementType"],
    printerId: row.printer_id,
    productId: row.product_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseMaterialStockMovementRepository implements IMaterialStockMovementRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByMaterialId(materialId: string): Promise<MaterialStockMovement[]> {
    const { data, error } = await this.supabase
      .from("material_stock_movements")
      .select("*")
      .eq("material_id", materialId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toMovement);
  }

  async create(input: CreateMaterialStockMovementInput): Promise<MaterialStockMovement> {
    const { data, error } = await this.supabase
      .from("material_stock_movements")
      .insert({
        material_id: input.materialId,
        quantity: input.quantity,
        movement_type: input.movementType,
        printer_id: input.printerId ?? null,
        product_id: input.productId ?? null,
        notes: input.notes ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toMovement(data);
  }

  async findBalanceByMaterialId(materialId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("material_stock_balances")
      .select("balance")
      .eq("material_id", materialId)
      .maybeSingle();
    if (error) throw error;
    return data?.balance ?? 0;
  }

  async findAllBalances(): Promise<MaterialStockBalance[]> {
    const { data, error } = await this.supabase.from("material_stock_balances").select("*");
    if (error) throw error;
    return (data ?? [])
      .filter((row): row is { material_id: string; balance: number | null } => row.material_id !== null)
      .map((row) => ({ materialId: row.material_id, balance: row.balance ?? 0 }));
  }

  async countByProductId(productId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("material_stock_movements")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId);
    if (error) throw error;
    return count ?? 0;
  }
}
