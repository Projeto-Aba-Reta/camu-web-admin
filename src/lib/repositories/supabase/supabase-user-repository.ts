import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { UserType } from "@/types/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LastOwnerError } from "@/lib/errors/domain-errors";
import type {
  InviteUserInput,
  IUserRepository,
  Profile,
} from "../interfaces/user-repository.interface";

const LAST_OWNER_ERROR_CODE = "P0001";

function toProfile(row: Database["public"]["Tables"]["profiles"]["Row"]): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    userType: row.user_type as Profile["userType"],
    status: row.status as Profile["status"],
  };
}

export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toProfile(data) : null;
  }

  async findByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    return data ? toProfile(data) : null;
  }

  async listAll(): Promise<Profile[]> {
    const { data, error } = await this.supabase.from("profiles").select("*").order("email");
    if (error) throw error;
    return (data ?? []).map(toProfile);
  }

  async invite(input: InviteUserInput): Promise<Profile> {
    // service_role: convidar usuário via Auth Admin API exige a chave
    // administrativa, nunca a anon key da sessão do chamador.
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(input.email, {
      data: input.fullName ? { full_name: input.fullName } : undefined,
    });
    if (error) throw error;

    const profile = await this.findById(data.user.id);
    if (!profile) {
      throw new Error("Perfil não encontrado após convite do usuário.");
    }
    return profile;
  }

  async changeUserType(userId: string, newType: UserType): Promise<Profile> {
    const { data, error } = await this.supabase.rpc("change_user_type", {
      p_user_id: userId,
      p_new_type: newType,
    });
    if (error) {
      if (error.code === LAST_OWNER_ERROR_CODE) {
        throw new LastOwnerError(error.message);
      }
      throw error;
    }
    return toProfile(data as Database["public"]["Tables"]["profiles"]["Row"]);
  }
}
