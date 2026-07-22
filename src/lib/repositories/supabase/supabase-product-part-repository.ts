import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PiecePart } from "@/types/catalog";
import type {
  CreatePiecePartInput,
  IProductPartRepository,
  UpdatePiecePartInput,
} from "../interfaces/product-part-repository.interface";

function toPiecePart(row: Database["public"]["Tables"]["product_parts"]["Row"]): PiecePart {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    quantity: row.quantity,
    materialId: row.material_id,
    pieceGrams: row.piece_grams,
    supportGrams: row.support_grams,
    printerId: row.printer_id,
    printHours: row.print_hours,
    position: row.position,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseProductPartRepository implements IProductPartRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByProductId(productId: string): Promise<PiecePart[]> {
    const { data, error } = await this.supabase
      .from("product_parts")
      .select("*")
      .eq("product_id", productId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toPiecePart);
  }

  async create(input: CreatePiecePartInput): Promise<PiecePart> {
    const { data, error } = await this.supabase
      .from("product_parts")
      .insert({
        product_id: input.productId,
        name: input.name,
        quantity: input.quantity,
        material_id: input.materialId,
        piece_grams: input.pieceGrams,
        support_grams: input.supportGrams,
        printer_id: input.printerId,
        print_hours: input.printHours,
        position: input.position ?? 0,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toPiecePart(data);
  }

  async update(id: string, input: UpdatePiecePartInput): Promise<PiecePart> {
    const { data, error } = await this.supabase
      .from("product_parts")
      .update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.materialId !== undefined ? { material_id: input.materialId } : {}),
        ...(input.pieceGrams !== undefined ? { piece_grams: input.pieceGrams } : {}),
        ...(input.supportGrams !== undefined ? { support_grams: input.supportGrams } : {}),
        ...(input.printerId !== undefined ? { printer_id: input.printerId } : {}),
        ...(input.printHours !== undefined ? { print_hours: input.printHours } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toPiecePart(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from("product_parts").delete().eq("id", id);
    if (error) throw error;
  }
}
