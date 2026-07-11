import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MeiCeilingParameter, MeiCeilingStatus, RevenueSnapshot } from "@/types/governance";
import type {
  CreateRevenueSnapshotInput,
  IRevenueSnapshotRepository,
  UpdateRevenueSnapshotInput,
  UpsertCeilingParameterInput,
} from "../interfaces/revenue-snapshot-repository.interface";

function toSnapshot(
  row: Database["public"]["Tables"]["revenue_snapshots"]["Row"],
): RevenueSnapshot {
  return {
    id: row.id,
    referenceMonth: row.reference_month,
    monthlyRevenue: row.monthly_revenue,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toCeilingParameter(
  row: Database["public"]["Tables"]["mei_ceiling_parameters"]["Row"],
): MeiCeilingParameter {
  return {
    id: row.id,
    year: row.year,
    annualCeiling: row.annual_ceiling,
    createdBy: row.created_by,
  };
}

export class SupabaseRevenueSnapshotRepository implements IRevenueSnapshotRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(): Promise<RevenueSnapshot[]> {
    const { data, error } = await this.supabase
      .from("revenue_snapshots")
      .select("*")
      .order("reference_month", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toSnapshot);
  }

  async findByMonth(referenceMonth: string): Promise<RevenueSnapshot | null> {
    const { data, error } = await this.supabase
      .from("revenue_snapshots")
      .select("*")
      .eq("reference_month", referenceMonth)
      .maybeSingle();
    if (error) throw error;
    return data ? toSnapshot(data) : null;
  }

  async create(input: CreateRevenueSnapshotInput): Promise<RevenueSnapshot> {
    const { data, error } = await this.supabase
      .from("revenue_snapshots")
      .insert({
        reference_month: input.referenceMonth,
        monthly_revenue: input.monthlyRevenue,
        notes: input.notes ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toSnapshot(data);
  }

  async update(input: UpdateRevenueSnapshotInput): Promise<RevenueSnapshot> {
    const { data, error } = await this.supabase
      .from("revenue_snapshots")
      .update({
        monthly_revenue: input.monthlyRevenue,
        notes: input.notes ?? null,
      })
      .eq("reference_month", input.referenceMonth)
      .select("*")
      .single();
    if (error) throw error;
    return toSnapshot(data);
  }

  async getCeilingForYear(year: number): Promise<MeiCeilingParameter | null> {
    const { data, error } = await this.supabase
      .from("mei_ceiling_parameters")
      .select("*")
      .eq("year", year)
      .maybeSingle();
    if (error) throw error;
    return data ? toCeilingParameter(data) : null;
  }

  async upsertCeilingParameter(input: UpsertCeilingParameterInput): Promise<MeiCeilingParameter> {
    const { data, error } = await this.supabase
      .from("mei_ceiling_parameters")
      .upsert(
        {
          year: input.year,
          annual_ceiling: input.annualCeiling,
          created_by: input.createdBy,
        },
        { onConflict: "year" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toCeilingParameter(data);
  }

  async getCeilingStatus(): Promise<MeiCeilingStatus> {
    // A view não retorna linha quando o teto do ano corrente ainda não foi
    // configurado (ou quando RLS nega acesso) — trata isso como status sem
    // teto definido, em vez de erro.
    const { data, error } = await this.supabase
      .from("mei_ceiling_status")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return {
      year: data?.year ?? new Date().getFullYear(),
      annualCeiling: data?.annual_ceiling ?? null,
      revenueLast12Months: data?.revenue_last_12_months ?? 0,
      percentageReached: data?.percentage_reached ?? null,
    };
  }
}
