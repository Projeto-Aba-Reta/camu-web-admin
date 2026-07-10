"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { RoleService } from "@/lib/services/role-service";
import { requireOwner } from "@/lib/auth/require-owner";
import { DuplicateSlugError } from "@/lib/errors/domain-errors";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function getRoleService(): Promise<RoleService> {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  return new RoleService(repositories);
}

export interface RoleFormInput {
  name: string;
  slug: string;
  description?: string;
}

export async function createRoleAction(input: RoleFormInput): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const roleService = await getRoleService();
    await roleService.createRole({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      createdBy: owner.id,
    });
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch (error) {
    if (error instanceof DuplicateSlugError) return { ok: false, error: error.message };
    return { ok: false, error: "Não foi possível criar a role." };
  }
}

export async function updateRoleAction(
  input: RoleFormInput & { id: string },
): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const roleService = await getRoleService();
    await roleService.updateRole(
      {
        id: input.id,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
      },
      owner.id,
    );
    revalidatePath("/admin/roles");
    revalidatePath(`/admin/roles/${input.id}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof DuplicateSlugError) return { ok: false, error: error.message };
    return { ok: false, error: "Não foi possível atualizar a role." };
  }
}

export async function deleteRoleAction(id: string): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const roleService = await getRoleService();
    await roleService.deleteRole(id, owner.id);
    revalidatePath("/admin/roles");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível excluir a role." };
  }
}

export interface SubRoleFormInput {
  roleId: string;
  name: string;
  slug: string;
  description?: string;
}

export async function createSubRoleAction(input: SubRoleFormInput): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const roleService = await getRoleService();
    await roleService.createSubRole(
      {
        roleId: input.roleId,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
      },
      owner.id,
    );
    revalidatePath(`/admin/roles/${input.roleId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof DuplicateSlugError) return { ok: false, error: error.message };
    return { ok: false, error: "Não foi possível criar a sub-role." };
  }
}

export async function updateSubRoleAction(
  input: SubRoleFormInput & { id: string },
): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const roleService = await getRoleService();
    await roleService.updateSubRole(
      {
        id: input.id,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
      },
      input.roleId,
      owner.id,
    );
    revalidatePath(`/admin/roles/${input.roleId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof DuplicateSlugError) return { ok: false, error: error.message };
    return { ok: false, error: "Não foi possível atualizar a sub-role." };
  }
}

export async function deleteSubRoleAction(id: string, roleId: string): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const roleService = await getRoleService();
    await roleService.deleteSubRole(id, roleId, owner.id);
    revalidatePath(`/admin/roles/${roleId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível excluir a sub-role." };
  }
}
