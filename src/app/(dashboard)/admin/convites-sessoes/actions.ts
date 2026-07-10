"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { InviteSessionService } from "@/lib/services/invite-session-service";
import { requireOwner } from "@/lib/auth/require-owner";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function getInviteSessionService(): Promise<InviteSessionService> {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  return new InviteSessionService(repositories);
}

export async function resendInviteAction(
  userId: string,
  email: string,
  fullName?: string | null,
): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const inviteSessionService = await getInviteSessionService();
    await inviteSessionService.resendInvite(owner.id, userId, email, fullName);
    revalidatePath("/admin/convites-sessoes");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível reenviar o convite." };
  }
}

export async function cancelInviteAction(userId: string): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const inviteSessionService = await getInviteSessionService();
    await inviteSessionService.cancelInvite(owner.id, userId);
    revalidatePath("/admin/convites-sessoes");
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível cancelar o convite." };
  }
}

export async function revokeSessionsAction(userId: string): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const inviteSessionService = await getInviteSessionService();
    await inviteSessionService.revokeSessions(owner.id, userId);
    revalidatePath(`/admin/usuarios/${userId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível revogar as sessões." };
  }
}
