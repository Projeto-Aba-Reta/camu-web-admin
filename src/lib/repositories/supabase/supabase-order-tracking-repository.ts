import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { OrderEvent } from "@/types/vendas";
import type { IOrderTrackingRepository } from "../interfaces/order-tracking-repository.interface";

function toEvent(row: Database["public"]["Tables"]["order_events"]["Row"]): OrderEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
  };
}

export class SupabaseOrderTrackingRepository implements IOrderTrackingRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listEvents(orderId: string): Promise<OrderEvent[]> {
    const { data, error } = await this.supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toEvent);
  }

  async updateStatus(orderId: string, status: string): Promise<void> {
    const { error } = await this.supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) throw error;
  }

  async insertEvent(orderId: string, status: string, note: string | null): Promise<OrderEvent> {
    const { data, error } = await this.supabase
      .from("order_events")
      .insert({ order_id: orderId, status, note })
      .select("*")
      .single();
    if (error) throw error;
    return toEvent(data);
  }
}
