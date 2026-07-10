import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  ISystemSettingsRepository,
  SystemSetting,
  UpsertSystemSettingInput,
} from "../interfaces/system-settings-repository.interface";

function toSetting(row: Database["public"]["Tables"]["system_settings"]["Row"]): SystemSetting {
  return {
    key: row.key,
    value: row.value,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSystemSettingsRepository implements ISystemSettingsRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(): Promise<SystemSetting[]> {
    const { data, error } = await this.supabase
      .from("system_settings")
      .select("*")
      .order("key");
    if (error) throw error;
    return (data ?? []).map(toSetting);
  }

  async get(key: string): Promise<SystemSetting | null> {
    const { data, error } = await this.supabase
      .from("system_settings")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data ? toSetting(data) : null;
  }

  async upsert(input: UpsertSystemSettingInput): Promise<SystemSetting> {
    const { data, error } = await this.supabase
      .from("system_settings")
      .upsert(
        {
          key: input.key,
          value: input.value,
          updated_by: input.updatedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return toSetting(data);
  }
}
