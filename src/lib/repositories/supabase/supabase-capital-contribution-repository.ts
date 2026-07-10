import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CapitalContribution } from "@/types/governance";
import type {
  CreateCapitalContributionInput,
  ICapitalContributionRepository,
} from "../interfaces/capital-contribution-repository.interface";

function toContribution(
  row: Database["public"]["Tables"]["capital_contributions"]["Row"],
): CapitalContribution {
  return {
    id: row.id,
    partnerProfileId: row.partner_profile_id,
    amount: row.amount,
    contributionDate: row.contribution_date,
    proofReference: row.proof_reference,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseCapitalContributionRepository implements ICapitalContributionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(): Promise<CapitalContribution[]> {
    const { data, error } = await this.supabase
      .from("capital_contributions")
      .select("*")
      .order("contribution_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toContribution);
  }

  async listByPartner(partnerProfileId: string): Promise<CapitalContribution[]> {
    const { data, error } = await this.supabase
      .from("capital_contributions")
      .select("*")
      .eq("partner_profile_id", partnerProfileId)
      .order("contribution_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toContribution);
  }

  async create(input: CreateCapitalContributionInput): Promise<CapitalContribution> {
    const { data, error } = await this.supabase
      .from("capital_contributions")
      .insert({
        partner_profile_id: input.partnerProfileId,
        amount: input.amount,
        contribution_date: input.contributionDate,
        proof_reference: input.proofReference ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toContribution(data);
  }
}
