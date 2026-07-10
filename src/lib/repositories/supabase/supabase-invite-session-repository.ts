import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IInviteSessionRepository } from "../interfaces/invite-session-repository.interface";

export class SupabaseInviteSessionRepository implements IInviteSessionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async resendInvite(email: string, fullName?: string | null): Promise<void> {
    // service_role: mesma justificativa de SupabaseUserRepository.invite —
    // reenviar o e-mail de convite exige a Auth Admin API.
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
    });
    if (error) throw error;
  }

  async cancelInvite(userId: string): Promise<void> {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  async revokeSessions(userId: string): Promise<void> {
    const { error } = await this.supabase.rpc("revoke_user_sessions", { p_user_id: userId });
    if (error) throw error;
  }
}
