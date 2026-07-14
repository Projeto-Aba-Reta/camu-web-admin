import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PrintQueueItem, PrintQueueItemMaterial, PrintQueueStatus } from "@/types/print-queue";
import type {
  CreatePrintQueueItemInput,
  CreatePrintQueueItemMaterialInput,
  IPrintQueueRepository,
  UpdatePrintQueueItemInput,
} from "../interfaces/print-queue-repository.interface";

function toPrintQueueItem(row: Database["public"]["Tables"]["print_queue_items"]["Row"]): PrintQueueItem {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    status: row.status as PrintQueueStatus,
    printerId: row.printer_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    expectedFinishAt: row.expected_finish_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toPrintQueueItemMaterial(
  row: Database["public"]["Tables"]["print_queue_item_materials"]["Row"],
): PrintQueueItemMaterial {
  return {
    id: row.id,
    printQueueItemId: row.print_queue_item_id,
    materialId: row.material_id,
    pieceGrams: row.piece_grams,
    supportGrams: row.support_grams,
  };
}

export class SupabasePrintQueueRepository implements IPrintQueueRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<PrintQueueItem | null> {
    const { data, error } = await this.supabase
      .from("print_queue_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toPrintQueueItem(data) : null;
  }

  async listByStatus(statuses?: PrintQueueStatus[]): Promise<PrintQueueItem[]> {
    let query = this.supabase.from("print_queue_items").select("*").order("created_at", { ascending: true });
    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toPrintQueueItem);
  }

  async create(input: CreatePrintQueueItemInput): Promise<PrintQueueItem> {
    const { data, error } = await this.supabase
      .from("print_queue_items")
      .insert({
        product_id: input.productId,
        quantity: input.quantity,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toPrintQueueItem(data);
  }

  async update(id: string, input: UpdatePrintQueueItemInput): Promise<PrintQueueItem> {
    const patch: Database["public"]["Tables"]["print_queue_items"]["Update"] = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.printerId !== undefined) patch.printer_id = input.printerId;
    if (input.startedAt !== undefined) patch.started_at = input.startedAt;
    if (input.finishedAt !== undefined) patch.finished_at = input.finishedAt;
    if (input.expectedFinishAt !== undefined) patch.expected_finish_at = input.expectedFinishAt;

    const { data, error } = await this.supabase
      .from("print_queue_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toPrintQueueItem(data);
  }

  async setItemMaterials(
    itemId: string,
    materials: CreatePrintQueueItemMaterialInput[],
  ): Promise<PrintQueueItemMaterial[]> {
    const { data, error } = await this.supabase
      .from("print_queue_item_materials")
      .insert(
        materials.map((material) => ({
          print_queue_item_id: itemId,
          material_id: material.materialId,
          piece_grams: material.pieceGrams,
          support_grams: material.supportGrams,
        })),
      )
      .select("*");
    if (error) throw error;
    return (data ?? []).map(toPrintQueueItemMaterial);
  }

  async findMaterialsByItemId(itemId: string): Promise<PrintQueueItemMaterial[]> {
    const { data, error } = await this.supabase
      .from("print_queue_item_materials")
      .select("*")
      .eq("print_queue_item_id", itemId);
    if (error) throw error;
    return (data ?? []).map(toPrintQueueItemMaterial);
  }

  async countByProductId(productId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("print_queue_items")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId);
    if (error) throw error;
    return count ?? 0;
  }
}
