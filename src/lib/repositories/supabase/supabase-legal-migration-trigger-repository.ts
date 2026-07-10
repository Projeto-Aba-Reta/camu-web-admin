import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  LegalMigrationTrigger,
  MigrationTriggerStatus,
  MigrationTriggerType,
} from "@/types/governance";
import type {
  ILegalMigrationTriggerRepository,
  UpdateLegalMigrationTriggerInput,
} from "../interfaces/legal-migration-trigger-repository.interface";

function toTrigger(
  row: Database["public"]["Tables"]["legal_migration_triggers"]["Row"],
): LegalMigrationTrigger {
  return {
    id: row.id,
    triggerType: row.trigger_type as MigrationTriggerType,
    status: row.status as MigrationTriggerStatus,
    reachedAt: row.reached_at,
    notes: row.notes,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export class SupabaseLegalMigrationTriggerRepository implements ILegalMigrationTriggerRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(): Promise<LegalMigrationTrigger[]> {
    const { data, error } = await this.supabase
      .from("legal_migration_triggers")
      .select("*")
      .order("trigger_type");
    if (error) throw error;
    return (data ?? []).map(toTrigger);
  }

  async updateStatus(input: UpdateLegalMigrationTriggerInput): Promise<LegalMigrationTrigger> {
    // Upsert por trigger_type: cria a linha na primeira vez que um gatilho é
    // referenciado (catálogo fixo dos 4 gatilhos, populado sob demanda pelo
    // seed) e atualiza in-place nas vezes seguintes.
    const { data, error } = await this.supabase
      .from("legal_migration_triggers")
      .upsert(
        {
          trigger_type: input.triggerType,
          status: input.status,
          reached_at: input.status === "atingido" ? new Date().toISOString() : null,
          notes: input.notes ?? null,
          updated_by: input.updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trigger_type" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toTrigger(data);
  }
}
