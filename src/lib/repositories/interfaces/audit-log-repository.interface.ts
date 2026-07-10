import type { Json } from "@/lib/supabase/database.types";

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Json | null;
  createdAt: string;
}

export interface RecordAuditLogInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Json | null;
}

export interface IAuditLogRepository {
  record(input: RecordAuditLogInput): Promise<void>;
  listRecent(limit?: number): Promise<AuditLogEntry[]>;
}
