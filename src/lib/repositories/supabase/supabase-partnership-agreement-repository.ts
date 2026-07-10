import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PartnershipAgreement } from "@/types/governance";
import type {
  CreatePartnershipAgreementInput,
  IPartnershipAgreementRepository,
} from "../interfaces/partnership-agreement-repository.interface";

function toAgreement(
  row: Database["public"]["Tables"]["partnership_agreements"]["Row"],
): PartnershipAgreement {
  return {
    id: row.id,
    profitSplitRule: row.profit_split_rule,
    exitTerms: row.exit_terms,
    validFrom: row.valid_from,
    createdBy: row.created_by,
  };
}

export class SupabasePartnershipAgreementRepository implements IPartnershipAgreementRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getCurrent(): Promise<PartnershipAgreement | null> {
    const { data, error } = await this.supabase
      .from("partnership_agreements")
      .select("*")
      .lte("valid_from", new Date().toISOString())
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toAgreement(data) : null;
  }

  async listHistory(): Promise<PartnershipAgreement[]> {
    const { data, error } = await this.supabase
      .from("partnership_agreements")
      .select("*")
      .order("valid_from", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toAgreement);
  }

  async create(input: CreatePartnershipAgreementInput): Promise<PartnershipAgreement> {
    const { data, error } = await this.supabase
      .from("partnership_agreements")
      .insert({
        profit_split_rule: input.profitSplitRule,
        exit_terms: input.exitTerms ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toAgreement(data);
  }
}
