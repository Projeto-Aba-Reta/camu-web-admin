import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { LegalEntityStatus, LegalEntityType } from "@/types/governance";
import type {
  CreateLegalEntityStatusInput,
  ILegalEntityStatusRepository,
} from "../interfaces/legal-entity-status-repository.interface";

function toStatus(
  row: Database["public"]["Tables"]["legal_entity_status"]["Row"],
): LegalEntityStatus {
  return {
    id: row.id,
    entityType: row.entity_type as LegalEntityType,
    cnpj: row.cnpj,
    titularProfileId: row.titular_profile_id,
    validFrom: row.valid_from,
    createdBy: row.created_by,
  };
}

export class SupabaseLegalEntityStatusRepository implements ILegalEntityStatusRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getCurrent(): Promise<LegalEntityStatus | null> {
    const { data, error } = await this.supabase
      .from("legal_entity_status")
      .select("*")
      .lte("valid_from", new Date().toISOString())
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toStatus(data) : null;
  }

  async listHistory(): Promise<LegalEntityStatus[]> {
    const { data, error } = await this.supabase
      .from("legal_entity_status")
      .select("*")
      .order("valid_from", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toStatus);
  }

  async create(input: CreateLegalEntityStatusInput): Promise<LegalEntityStatus> {
    const { data, error } = await this.supabase
      .from("legal_entity_status")
      .insert({
        entity_type: input.entityType,
        cnpj: input.cnpj ?? null,
        titular_profile_id: input.titularProfileId ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toStatus(data);
  }
}
