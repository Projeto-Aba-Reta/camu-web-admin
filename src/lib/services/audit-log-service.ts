import type { Repositories } from "@/lib/repositories";
import type { AuditLogEntry } from "@/lib/repositories/interfaces/audit-log-repository.interface";
import type { Json } from "@/lib/supabase/database.types";

export const AUDIT_ACTIONS = {
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",
  SUB_ROLE_CREATE: "sub_role.create",
  SUB_ROLE_UPDATE: "sub_role.update",
  SUB_ROLE_DELETE: "sub_role.delete",
  USER_INVITE: "user.invite",
  USER_CHANGE_TYPE: "user.change_type",
  USER_ASSIGN_ROLE: "user.assign_role",
  USER_UNASSIGN_ROLE: "user.unassign_role",
  USER_ASSIGN_SUB_ROLE: "user.assign_sub_role",
  USER_UNASSIGN_SUB_ROLE: "user.unassign_sub_role",
  SYSTEM_SETTING_UPDATE: "system_setting.update",
  INVITE_RESEND: "invite.resend",
  INVITE_CANCEL: "invite.cancel",
  SESSION_REVOKE: "session.revoke",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export class AuditLogService {
  constructor(private readonly repositories: Pick<Repositories, "auditLog">) {}

  record(
    actorId: string | null,
    action: AuditAction,
    entityType: string,
    entityId?: string | null,
    metadata?: Json | null,
  ): Promise<void> {
    return this.repositories.auditLog.record({
      actorId,
      action,
      entityType,
      entityId,
      metadata,
    });
  }

  listRecent(limit?: number): Promise<AuditLogEntry[]> {
    return this.repositories.auditLog.listRecent(limit);
  }
}
