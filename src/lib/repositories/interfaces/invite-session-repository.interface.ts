export interface IInviteSessionRepository {
  resendInvite(email: string, fullName?: string | null): Promise<void>;
  cancelInvite(userId: string): Promise<void>;
  revokeSessions(userId: string): Promise<void>;
}
