import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { IRoleRepository } from "./interfaces/role-repository.interface";
import type { ISubRoleRepository } from "./interfaces/sub-role-repository.interface";
import type { IUserRepository } from "./interfaces/user-repository.interface";
import { SupabaseRoleRepository } from "./supabase/supabase-role-repository";
import { SupabaseSubRoleRepository } from "./supabase/supabase-sub-role-repository";
import { SupabaseUserRepository } from "./supabase/supabase-user-repository";

export interface Repositories {
  roles: IRoleRepository;
  subRoles: ISubRoleRepository;
  users: IUserRepository;
}

// Composition root: único ponto que muda para trocar de provedor de dados.
export function createRepositories(supabaseClient: SupabaseClient<Database>): Repositories {
  return {
    roles: new SupabaseRoleRepository(supabaseClient),
    subRoles: new SupabaseSubRoleRepository(supabaseClient),
    users: new SupabaseUserRepository(supabaseClient),
  };
}
