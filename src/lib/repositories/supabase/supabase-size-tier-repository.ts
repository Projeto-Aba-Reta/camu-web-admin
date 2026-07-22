import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SizeTierDefinition } from "@/types/pricing";
import type {
  CreateSizeTierInput,
  ISizeTierRepository,
  UpdateSizeTierInput,
} from "../interfaces/size-tier-repository.interface";

function toSizeTierDefinition(
  row: Database["public"]["Tables"]["size_tiers"]["Row"],
): SizeTierDefinition {
  return {
    code: row.code,
    label: row.label,
    sortOrder: row.sort_order,
    isSystem: row.is_system,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseSizeTierRepository implements ISizeTierRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAll(): Promise<SizeTierDefinition[]> {
    const { data, error } = await this.supabase
      .from("size_tiers")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toSizeTierDefinition);
  }

  async findByCode(code: string): Promise<SizeTierDefinition | null> {
    const { data, error } = await this.supabase.from("size_tiers").select("*").eq("code", code).maybeSingle();
    if (error) throw error;
    return data ? toSizeTierDefinition(data) : null;
  }

  async create(input: CreateSizeTierInput): Promise<SizeTierDefinition> {
    const { data, error } = await this.supabase
      .from("size_tiers")
      .insert({
        code: input.code,
        label: input.label,
        sort_order: input.sortOrder,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toSizeTierDefinition(data);
  }

  async update(code: string, input: UpdateSizeTierInput): Promise<SizeTierDefinition> {
    const { data, error } = await this.supabase
      .from("size_tiers")
      .update({ label: input.label, sort_order: input.sortOrder })
      .eq("code", code)
      .select("*")
      .single();
    if (error) throw error;
    return toSizeTierDefinition(data);
  }

  async remove(code: string): Promise<void> {
    const { error } = await this.supabase.from("size_tiers").delete().eq("code", code);
    if (error) throw error;
  }

  // Peças (products.size_tier) e faixas (size_tier_ranges.tier) que apontam
  // para o porte. size_tier_ranges tem FK, então o delete já falharia por
  // ela; a contagem serve para uma mensagem de erro clara antes disso.
  async countReferences(code: string): Promise<number> {
    const [products, ranges] = await Promise.all([
      this.supabase.from("products").select("id", { count: "exact", head: true }).eq("size_tier", code),
      this.supabase.from("size_tier_ranges").select("id", { count: "exact", head: true }).eq("tier", code),
    ]);
    if (products.error) throw products.error;
    if (ranges.error) throw ranges.error;
    return (products.count ?? 0) + (ranges.count ?? 0);
  }
}
