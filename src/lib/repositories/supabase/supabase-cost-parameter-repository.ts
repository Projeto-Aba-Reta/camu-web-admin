import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CostParameters } from "@/types/pricing";
import type {
  CreateCostParametersInput,
  ICostParameterRepository,
} from "../interfaces/cost-parameter-repository.interface";

function toCostParameters(
  row: Database["public"]["Tables"]["cost_parameters"]["Row"],
): CostParameters {
  return {
    id: row.id,
    filamentCostPerKg: row.filament_cost_per_kg,
    energyCostPerKwh: row.energy_cost_per_kwh,
    averagePowerWatts: row.average_power_watts,
    failureReservePct: row.failure_reserve_pct,
    packagingCost: row.packaging_cost,
    validFrom: row.valid_from,
    createdBy: row.created_by,
  };
}

export class SupabaseCostParameterRepository implements ICostParameterRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findCurrent(): Promise<CostParameters | null> {
    const { data, error } = await this.supabase
      .from("cost_parameters")
      .select("*")
      .lte("valid_from", new Date().toISOString())
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toCostParameters(data) : null;
  }

  async findById(id: string): Promise<CostParameters | null> {
    const { data, error } = await this.supabase
      .from("cost_parameters")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toCostParameters(data) : null;
  }

  async findHistory(): Promise<CostParameters[]> {
    const { data, error } = await this.supabase
      .from("cost_parameters")
      .select("*")
      .order("valid_from", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toCostParameters);
  }

  async create(input: CreateCostParametersInput): Promise<CostParameters> {
    const { data, error } = await this.supabase
      .from("cost_parameters")
      .insert({
        filament_cost_per_kg: input.filamentCostPerKg,
        energy_cost_per_kwh: input.energyCostPerKwh,
        average_power_watts: input.averagePowerWatts,
        failure_reserve_pct: input.failureReservePct,
        packaging_cost: input.packagingCost,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toCostParameters(data);
  }
}
