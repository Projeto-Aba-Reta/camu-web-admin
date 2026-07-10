import type { Repositories } from "@/lib/repositories";
import { AuditLogService, AUDIT_ACTIONS } from "./audit-log-service";

export class InviteSessionService {
  constructor(
    private readonly repositories: Pick<Repositories, "inviteSessions" | "auditLog">,
  ) {}

  async resendInvite(actorId: string, userId: string, email: string, fullName?: string | null) {
    await this.repositories.inviteSessions.resendInvite(email, fullName);
    const auditLog = new AuditLogService(this.repositories);
    await auditLog.record(actorId, AUDIT_ACTIONS.INVITE_RESEND, "profiles", userId, { email });
  }

  async cancelInvite(actorId: string, userId: string) {
    await this.repositories.inviteSessions.cancelInvite(userId);
    const auditLog = new AuditLogService(this.repositories);
    await auditLog.record(actorId, AUDIT_ACTIONS.INVITE_CANCEL, "profiles", userId);
  }

  async revokeSessions(actorId: string, userId: string) {
    await this.repositories.inviteSessions.revokeSessions(userId);
    const auditLog = new AuditLogService(this.repositories);
    await auditLog.record(actorId, AUDIT_ACTIONS.SESSION_REVOKE, "profiles", userId);
  }
}
