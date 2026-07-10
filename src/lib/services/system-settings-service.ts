import type { Repositories } from "@/lib/repositories";
import type { Json } from "@/lib/supabase/database.types";
import type { SystemSetting } from "@/lib/repositories/interfaces/system-settings-repository.interface";
import { AuditLogService, AUDIT_ACTIONS } from "./audit-log-service";

export class SystemSettingsService {
  constructor(
    private readonly repositories: Pick<Repositories, "systemSettings" | "auditLog">,
  ) {}

  listSettings(): Promise<SystemSetting[]> {
    return this.repositories.systemSettings.listAll();
  }

  getSetting(key: string): Promise<SystemSetting | null> {
    return this.repositories.systemSettings.get(key);
  }

  async updateSetting(key: string, value: Json, updatedBy: string): Promise<SystemSetting> {
    const setting = await this.repositories.systemSettings.upsert({
      key,
      value,
      updatedBy,
    });

    const auditLog = new AuditLogService(this.repositories);
    await auditLog.record(updatedBy, AUDIT_ACTIONS.SYSTEM_SETTING_UPDATE, "system_settings", key, {
      value,
    });

    return setting;
  }
}
