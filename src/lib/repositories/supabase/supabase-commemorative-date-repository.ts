import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CommemorativeDate, CommemorativeDateRuleType } from "@/types/marketing";
import type {
  CreateCommemorativeDateInput,
  ICommemorativeDateRepository,
  UpdateCommemorativeDateInput,
} from "../interfaces/commemorative-date-repository.interface";

function toCommemorativeDate(
  row: Database["public"]["Tables"]["commemorative_dates_marketing"]["Row"],
): CommemorativeDate {
  return {
    id: row.id,
    name: row.name,
    ruleType: row.rule_type as CommemorativeDateRuleType,
    ruleValue: row.rule_value,
    category: row.category,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseCommemorativeDateRepository implements ICommemorativeDateRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<CommemorativeDate | null> {
    const { data, error } = await this.supabase
      .from("commemorative_dates_marketing")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toCommemorativeDate(data) : null;
  }

  async findAll(onlyActive?: boolean): Promise<CommemorativeDate[]> {
    let query = this.supabase
      .from("commemorative_dates_marketing")
      .select("*")
      .order("rule_value", { ascending: true });
    if (onlyActive) {
      query = query.eq("is_active", true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toCommemorativeDate);
  }

  async create(input: CreateCommemorativeDateInput): Promise<CommemorativeDate> {
    const { data, error } = await this.supabase
      .from("commemorative_dates_marketing")
      .insert({
        name: input.name,
        rule_type: input.ruleType,
        rule_value: input.ruleValue,
        category: input.category,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toCommemorativeDate(data);
  }

  async update(id: string, input: UpdateCommemorativeDateInput): Promise<CommemorativeDate> {
    const patch: Database["public"]["Tables"]["commemorative_dates_marketing"]["Update"] = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.ruleType !== undefined) patch.rule_type = input.ruleType;
    if (input.ruleValue !== undefined) patch.rule_value = input.ruleValue;
    if (input.category !== undefined) patch.category = input.category;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await this.supabase
      .from("commemorative_dates_marketing")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toCommemorativeDate(data);
  }
}
