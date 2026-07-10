import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Role } from "@/types/auth";
import { DuplicateSlugError } from "@/lib/errors/domain-errors";
import type {
  AssignRoleInput,
  CreateRoleInput,
  IRoleRepository,
  RoleAssignment,
  UpdateRoleInput,
} from "../interfaces/role-repository.interface";

const UNIQUE_VIOLATION = "23505";

function toRole(row: Database["public"]["Tables"]["roles"]["Row"]): Role {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
  };
}

export class SupabaseRoleRepository implements IRoleRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAll(): Promise<Role[]> {
    const { data, error } = await this.supabase.from("roles").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map(toRole);
  }

  async findById(id: string): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toRole(data) : null;
  }

  async findBySlug(slug: string): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from("roles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toRole(data) : null;
  }

  async findManyForUser(userId: string): Promise<Role[]> {
    const { data: assignments, error } = await this.supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId);
    if (error) throw error;

    const roleIds = (assignments ?? []).map((assignment) => assignment.role_id);
    if (roleIds.length === 0) return [];

    const { data, error: rolesError } = await this.supabase
      .from("roles")
      .select("*")
      .in("id", roleIds);
    if (rolesError) throw rolesError;
    return (data ?? []).map(toRole);
  }

  async listAllAssignments(): Promise<RoleAssignment[]> {
    const { data, error } = await this.supabase.from("user_roles").select("user_id, role_id");
    if (error) throw error;
    return (data ?? []).map((row) => ({ userId: row.user_id, roleId: row.role_id }));
  }

  async create(input: CreateRoleInput): Promise<Role> {
    const { data, error } = await this.supabase
      .from("roles")
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new DuplicateSlugError(`Já existe uma role com o slug "${input.slug}".`);
      }
      throw error;
    }
    return toRole(data);
  }

  async update(input: UpdateRoleInput): Promise<Role> {
    const { data, error } = await this.supabase
      .from("roles")
      .update({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        icon: input.icon ?? null,
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new DuplicateSlugError(`Já existe uma role com o slug "${input.slug}".`);
      }
      throw error;
    }
    return toRole(data);
  }

  async delete(id: string): Promise<void> {
    // sub_roles, user_roles e (via sub_roles) user_sub_roles têm
    // `on delete cascade` para role_id/sub_role_id — a exclusão em cascata
    // acontece no banco, não precisa de queries adicionais aqui.
    const { error } = await this.supabase.from("roles").delete().eq("id", id);
    if (error) throw error;
  }

  async assignToUser(input: AssignRoleInput): Promise<void> {
    const { error } = await this.supabase.from("user_roles").upsert(
      {
        user_id: input.userId,
        role_id: input.roleId,
        granted_by: input.grantedBy,
      },
      { onConflict: "user_id,role_id" },
    );
    if (error) throw error;
  }

  async unassignFromUser(userId: string, roleId: string): Promise<void> {
    const { error } = await this.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", roleId);
    if (error) throw error;
  }
}
