import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProductStockMovement } from "@/types/inventory";
import type {
  CreateProductStockMovementInput,
  IProductStockMovementRepository,
  ProductStockBalance,
} from "../interfaces/product-stock-movement-repository.interface";

function toMovement(
  row: Database["public"]["Tables"]["product_stock_movements"]["Row"],
): ProductStockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    movementType: row.movement_type as ProductStockMovement["movementType"],
    materialStockMovementId: row.material_stock_movement_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseProductStockMovementRepository implements IProductStockMovementRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByProductId(productId: string): Promise<ProductStockMovement[]> {
    const { data, error } = await this.supabase
      .from("product_stock_movements")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toMovement);
  }

  async create(input: CreateProductStockMovementInput): Promise<ProductStockMovement> {
    const { data, error } = await this.supabase
      .from("product_stock_movements")
      .insert({
        product_id: input.productId,
        quantity: input.quantity,
        movement_type: input.movementType,
        material_stock_movement_id: input.materialStockMovementId ?? null,
        notes: input.notes ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toMovement(data);
  }

  async findBalanceByProductId(productId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("product_stock_balances")
      .select("balance")
      .eq("product_id", productId)
      .maybeSingle();
    if (error) throw error;
    return data?.balance ?? 0;
  }

  async findAllBalances(): Promise<ProductStockBalance[]> {
    const { data, error } = await this.supabase.from("product_stock_balances").select("*");
    if (error) throw error;
    return (data ?? [])
      .filter((row): row is { product_id: string; balance: number | null } => row.product_id !== null)
      .map((row) => ({ productId: row.product_id, balance: row.balance ?? 0 }));
  }
}
