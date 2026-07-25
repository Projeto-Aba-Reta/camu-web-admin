import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { OrderStageEvent } from "@/types/vendas";
import type {
  IOrderStageEventRepository,
  RecordStageEventInput,
} from "../interfaces/order-stage-event-repository.interface";

function toEvent(
  row: Database["public"]["Tables"]["order_stage_events"]["Row"],
): OrderStageEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    fromStageId: row.from_stage_id,
    toStageId: row.to_stage_id,
    printerId: row.printer_id,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseOrderStageEventRepository implements IOrderStageEventRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listByOrder(orderId: string): Promise<OrderStageEvent[]> {
    const { data, error } = await this.supabase
      .from("order_stage_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toEvent);
  }

  async record(input: RecordStageEventInput): Promise<OrderStageEvent> {
    const { data, error } = await this.supabase
      .from("order_stage_events")
      .insert({
        order_id: input.orderId,
        from_stage_id: input.fromStageId,
        to_stage_id: input.toStageId,
        printer_id: input.printerId,
        note: input.note,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toEvent(data);
  }
}
