import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AuditLogEntry,
  IAuditLogRepository,
  RecordAuditLogInput,
} from "../interfaces/audit-log-repository.interface";

function toEntry(row: Database["public"]["Tables"]["audit_log"]["Row"]): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export class SupabaseAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    const { error } = await this.supabase.from("audit_log").insert({
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
    if (error) throw error;
  }

  async listRecent(limit = 100): Promise<AuditLogEntry[]> {
    const { data, error } = await this.supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toEntry);
  }
}
