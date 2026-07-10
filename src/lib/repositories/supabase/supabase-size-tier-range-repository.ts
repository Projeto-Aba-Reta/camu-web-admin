import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SizeTier, SizeTierRange } from "@/types/pricing";
import type {
  CreateSizeTierRangeInput,
  ISizeTierRangeRepository,
} from "../interfaces/size-tier-range-repository.interface";

function toSizeTierRange(
  row: Database["public"]["Tables"]["size_tier_ranges"]["Row"],
): SizeTierRange {
  return {
    id: row.id,
    tier: row.tier as SizeTier,
    minWeightGrams: row.min_weight_grams,
    maxWeightGrams: row.max_weight_grams,
    minPrintHours: row.min_print_hours,
    maxPrintHours: row.max_print_hours,
    validFrom: row.valid_from,
  };
}

export class SupabaseSizeTierRangeRepository implements ISizeTierRangeRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAllCurrent(): Promise<SizeTierRange[]> {
    // Vigência independente por tier (P/M/G): mantém, por tier, só a linha
    // de maior valid_from.
    const { data, error } = await this.supabase
      .from("size_tier_ranges")
      .select("*")
      .order("tier", { ascending: true })
      .order("valid_from", { ascending: false });
    if (error) throw error;

    const currentByTier = new Map<string, Database["public"]["Tables"]["size_tier_ranges"]["Row"]>();
    for (const row of data ?? []) {
      if (!currentByTier.has(row.tier)) currentByTier.set(row.tier, row);
    }

    return Array.from(currentByTier.values()).map(toSizeTierRange);
  }

  async create(input: CreateSizeTierRangeInput): Promise<SizeTierRange> {
    const { data, error } = await this.supabase
      .from("size_tier_ranges")
      .insert({
        tier: input.tier,
        min_weight_grams: input.minWeightGrams,
        max_weight_grams: input.maxWeightGrams,
        min_print_hours: input.minPrintHours,
        max_print_hours: input.maxPrintHours,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toSizeTierRange(data);
  }
}
