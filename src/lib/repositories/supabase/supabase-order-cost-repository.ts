import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { OrderCost, OrderCostCategory } from "@/types/vendas";
import type {
  CreateOrderCostInput,
  IOrderCostRepository,
  UpdateOrderCostInput,
} from "../interfaces/order-cost-repository.interface";

function toCost(row: Database["public"]["Tables"]["order_costs"]["Row"]): OrderCost {
  return {
    id: row.id,
    orderId: row.order_id,
    amountCents: row.amount_cents,
    category: row.category as OrderCostCategory,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseOrderCostRepository implements IOrderCostRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listByOrder(orderId: string): Promise<OrderCost[]> {
    const { data, error } = await this.supabase
      .from("order_costs")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toCost);
  }

  async findById(id: string): Promise<OrderCost | null> {
    const { data, error } = await this.supabase
      .from("order_costs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toCost(data) : null;
  }

  async create(input: CreateOrderCostInput): Promise<OrderCost> {
    const { data, error } = await this.supabase
      .from("order_costs")
      .insert({
        order_id: input.orderId,
        amount_cents: input.amountCents,
        category: input.category,
        description: input.description,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toCost(data);
  }

  async update(id: string, input: UpdateOrderCostInput): Promise<OrderCost> {
    const patch: Database["public"]["Tables"]["order_costs"]["Update"] = {};
    if (input.amountCents !== undefined) patch.amount_cents = input.amountCents;
    if (input.category !== undefined) patch.category = input.category;
    if (input.description !== undefined) patch.description = input.description;

    const { data, error } = await this.supabase
      .from("order_costs")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toCost(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("order_costs").delete().eq("id", id);
    if (error) throw error;
  }
}
