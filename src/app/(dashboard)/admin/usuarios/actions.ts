"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { UserService } from "@/lib/services/user-service";
import { requireOwner } from "@/lib/auth/require-owner";
import { LastOwnerError, UserAlreadyExistsError } from "@/lib/errors/domain-errors";
import type { UserType } from "@/types/auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function getUserService(): Promise<UserService> {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  return new UserService(repositories);
}

export async function inviteUserAction(input: {
  email: string;
  fullName?: string;
}): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const userService = await getUserService();
    await userService.inviteUser(
      { email: input.email, fullName: input.fullName || undefined },
      owner.id,
    );
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) return { ok: false, error: error.message };
    return { ok: false, error: "Não foi possível convidar o usuário." };
  }
}

export async function changeUserTypeAction(
  userId: string,
  newType: UserType,
): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const userService = await getUserService();
    await userService.changeUserType(userId, newType, owner.id);
    revalidatePath("/admin/usuarios");
    revalidatePath(`/admin/usuarios/${userId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof LastOwnerError) return { ok: false, error: error.message };
    return { ok: false, error: "Não foi possível alterar o tipo do usuário." };
  }
}

export async function assignRoleAction(userId: string, roleId: string): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const userService = await getUserService();
    await userService.assignRole(userId, roleId, owner.id);
    revalidatePath(`/admin/usuarios/${userId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atribuir a role." };
  }
}

export async function unassignRoleAction(userId: string, roleId: string): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const userService = await getUserService();
    await userService.unassignRole(userId, roleId, owner.id);
    revalidatePath(`/admin/usuarios/${userId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover a role." };
  }
}

export async function assignSubRoleAction(
  userId: string,
  subRoleId: string,
): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const userService = await getUserService();
    await userService.assignSubRole({ userId, subRoleId, grantedBy: owner.id });
    revalidatePath(`/admin/usuarios/${userId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atribuir a sub-role." };
  }
}

export async function unassignSubRoleAction(
  userId: string,
  subRoleId: string,
): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const userService = await getUserService();
    await userService.unassignSubRole(userId, subRoleId, owner.id);
    revalidatePath(`/admin/usuarios/${userId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível remover a sub-role." };
  }
}
