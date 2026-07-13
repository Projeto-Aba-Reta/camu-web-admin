import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { B2bPricingTier } from "@/types/pricing";
import type {
  CreateB2bPricingTierInput,
  IB2bPricingTierRepository,
} from "../interfaces/b2b-pricing-tier-repository.interface";

function toB2bPricingTier(
  row: Database["public"]["Tables"]["b2b_pricing_tiers"]["Row"],
): B2bPricingTier {
  return {
    id: row.id,
    minQuantity: row.min_quantity,
    targetMarginPct: row.target_margin_pct,
    validFrom: row.valid_from,
    createdBy: row.created_by,
  };
}

export class SupabaseB2bPricingTierRepository implements IB2bPricingTierRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAllCurrent(): Promise<B2bPricingTier[]> {
    // Vigência é independente por faixa (min_quantity): busca todo o
    // histórico e mantém, por min_quantity, só a linha de maior valid_from.
    const { data, error } = await this.supabase
      .from("b2b_pricing_tiers")
      .select("*")
      .order("min_quantity", { ascending: true })
      .order("valid_from", { ascending: false });
    if (error) throw error;

    const currentByMinQuantity = new Map<number, Database["public"]["Tables"]["b2b_pricing_tiers"]["Row"]>();
    for (const row of data ?? []) {
      if (!currentByMinQuantity.has(row.min_quantity)) currentByMinQuantity.set(row.min_quantity, row);
    }

    return Array.from(currentByMinQuantity.values())
      .sort((a, b) => a.min_quantity - b.min_quantity)
      .map(toB2bPricingTier);
  }

  async findAllHistory(): Promise<B2bPricingTier[]> {
    const { data, error } = await this.supabase
      .from("b2b_pricing_tiers")
      .select("*")
      .order("min_quantity", { ascending: true })
      .order("valid_from", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toB2bPricingTier);
  }

  async create(input: CreateB2bPricingTierInput): Promise<B2bPricingTier> {
    const { data, error } = await this.supabase
      .from("b2b_pricing_tiers")
      .insert({
        min_quantity: input.minQuantity,
        target_margin_pct: input.targetMarginPct,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toB2bPricingTier(data);
  }
}
