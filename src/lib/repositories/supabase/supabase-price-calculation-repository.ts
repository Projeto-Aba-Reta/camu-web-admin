import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  B2bPrice,
  ChannelPrice,
  CompositeComponentCost,
  CostBreakdown,
  PriceCalculation,
  SizeTier,
  SuggestedTier,
} from "@/types/pricing";
import type {
  CreatePriceCalculationInput,
  IPriceCalculationRepository,
} from "../interfaces/price-calculation-repository.interface";

// suggested_tier é uma coluna text simples (ver design.md); a ambiguidade
// entre dois tiers candidatos é serializada como "P/G" e desserializada de
// volta em SuggestedTier. null (cálculo de peça composta, sem porte único a
// classificar) permanece null nos dois sentidos.
function serializeSuggestedTier(tier: SuggestedTier | null): string | null {
  if (!tier) return null;
  return tier.ambiguous ? tier.candidates.join("/") : tier.tier;
}

function deserializeSuggestedTier(value: string | null): SuggestedTier | null {
  if (!value) return null;
  const candidates = value.split("/").filter(Boolean) as SizeTier[];
  if (candidates.length > 1) return { ambiguous: true, candidates };
  return { ambiguous: false, tier: (candidates[0] ?? "M") as SizeTier };
}

function toPriceCalculation(
  row: Database["public"]["Tables"]["price_calculations"]["Row"],
): PriceCalculation {
  return {
    id: row.id,
    weightGrams: row.weight_grams,
    printHours: row.print_hours,
    printerId: row.printer_id,
    productId: row.product_id,
    slicingSheetId: row.slicing_sheet_id,
    costParametersId: row.cost_parameters_id,
    suggestedTier: deserializeSuggestedTier(row.suggested_tier),
    totalCost: row.total_cost,
    costBreakdown: row.cost_breakdown as unknown as CostBreakdown,
    channelPrices: row.channel_prices as unknown as ChannelPrice[],
    b2bPrices: (row.b2b_prices ?? []) as unknown as B2bPrice[],
    componentBreakdown: row.component_breakdown as unknown as CompositeComponentCost[] | null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabasePriceCalculationRepository implements IPriceCalculationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<PriceCalculation | null> {
    const { data, error } = await this.supabase
      .from("price_calculations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toPriceCalculation(data) : null;
  }

  async findRecent(limit = 200): Promise<PriceCalculation[]> {
    const { data, error } = await this.supabase
      .from("price_calculations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toPriceCalculation);
  }

  async create(input: CreatePriceCalculationInput): Promise<PriceCalculation> {
    const { data, error } = await this.supabase
      .from("price_calculations")
      .insert({
        weight_grams: input.weightGrams,
        print_hours: input.printHours,
        printer_id: input.printerId,
        product_id: input.productId,
        slicing_sheet_id: input.slicingSheetId,
        cost_parameters_id: input.costParametersId,
        suggested_tier: serializeSuggestedTier(input.suggestedTier),
        total_cost: input.totalCost,
        cost_breakdown: input.costBreakdown as unknown as Database["public"]["Tables"]["price_calculations"]["Insert"]["cost_breakdown"],
        channel_prices: input.channelPrices as unknown as Database["public"]["Tables"]["price_calculations"]["Insert"]["channel_prices"],
        b2b_prices: input.b2bPrices as unknown as Database["public"]["Tables"]["price_calculations"]["Insert"]["b2b_prices"],
        component_breakdown:
          input.componentBreakdown as unknown as Database["public"]["Tables"]["price_calculations"]["Insert"]["component_breakdown"],
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toPriceCalculation(data);
  }
}
