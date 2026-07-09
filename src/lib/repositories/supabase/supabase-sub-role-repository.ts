import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SubRole } from "@/types/auth";
import type {
  AssignSubRoleInput,
  CreateSubRoleInput,
  ISubRoleRepository,
} from "../interfaces/sub-role-repository.interface";

function toSubRole(row: Database["public"]["Tables"]["sub_roles"]["Row"]): SubRole {
  return {
    id: row.id,
    roleId: row.role_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
  };
}

export class SupabaseSubRoleRepository implements ISubRoleRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<SubRole | null> {
    const { data, error } = await this.supabase
      .from("sub_roles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toSubRole(data) : null;
  }

  async findManyForRole(roleId: string): Promise<SubRole[]> {
    const { data, error } = await this.supabase
      .from("sub_roles")
      .select("*")
      .eq("role_id", roleId)
      .order("name");
    if (error) throw error;
    return (data ?? []).map(toSubRole);
  }

  async findManyForUser(userId: string): Promise<SubRole[]> {
    const { data: assignments, error } = await this.supabase
      .from("user_sub_roles")
      .select("sub_role_id")
      .eq("user_id", userId);
    if (error) throw error;

    const subRoleIds = (assignments ?? []).map((assignment) => assignment.sub_role_id);
    if (subRoleIds.length === 0) return [];

    const { data, error: subRolesError } = await this.supabase
      .from("sub_roles")
      .select("*")
      .in("id", subRoleIds);
    if (subRolesError) throw subRolesError;
    return (data ?? []).map(toSubRole);
  }

  async create(input: CreateSubRoleInput): Promise<SubRole> {
    const { data, error } = await this.supabase
      .from("sub_roles")
      .insert({
        role_id: input.roleId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toSubRole(data);
  }

  async assignToUser(input: AssignSubRoleInput): Promise<void> {
    const { error } = await this.supabase.from("user_sub_roles").upsert(
      {
        user_id: input.userId,
        sub_role_id: input.subRoleId,
        granted_by: input.grantedBy,
      },
      { onConflict: "user_id,sub_role_id" },
    );
    if (error) throw error;
  }
}
