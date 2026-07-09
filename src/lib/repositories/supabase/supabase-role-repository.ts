import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Role } from "@/types/auth";
import type {
  AssignRoleInput,
  CreateRoleInput,
  IRoleRepository,
} from "../interfaces/role-repository.interface";

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
    if (error) throw error;
    return toRole(data);
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
}
