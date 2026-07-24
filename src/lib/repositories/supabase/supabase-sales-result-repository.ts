import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MonthlySalesResultRow } from "@/types/vendas";
import type { ISalesResultRepository } from "../interfaces/sales-result-repository.interface";

export class SupabaseSalesResultRepository implements ISalesResultRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listByMonthRange(fromMonth: string, toMonth: string): Promise<MonthlySalesResultRow[]> {
    const { data, error } = await this.supabase
      .from("sales_monthly_results")
      .select("*")
      .gte("month", fromMonth)
      .lte("month", toMonth)
      .order("month", { ascending: true });
    if (error) throw error;

    return (data ?? [])
      .filter((row): row is typeof row & { month: string } => Boolean(row.month))
      .map((row) => ({
        month: row.month,
        saleOriginId: row.sale_origin_id,
        revenueCents: row.revenue_cents ?? 0,
        costCents: row.cost_cents ?? 0,
        profitCents: row.profit_cents ?? 0,
        orderCount: row.order_count ?? 0,
      }));
  }
}
