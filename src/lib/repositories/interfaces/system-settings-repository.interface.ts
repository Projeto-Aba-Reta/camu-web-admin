import type { Json } from "@/lib/supabase/database.types";

export interface SystemSetting {
  key: string;
  value: Json;
  updatedBy: string | null;
  updatedAt: string;
}

export interface UpsertSystemSettingInput {
  key: string;
  value: Json;
  updatedBy: string | null;
}

export interface ISystemSettingsRepository {
  listAll(): Promise<SystemSetting[]>;
  get(key: string): Promise<SystemSetting | null>;
  upsert(input: UpsertSystemSettingInput): Promise<SystemSetting>;
}
