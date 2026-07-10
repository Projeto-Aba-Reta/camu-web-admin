"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { SystemSettingsService } from "@/lib/services/system-settings-service";
import { requireOwner } from "@/lib/auth/require-owner";
import type { Json } from "@/lib/supabase/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateSystemSettingAction(key: string, value: Json): Promise<ActionResult> {
  try {
    const owner = await requireOwner();
    const supabase = await createClient();
    const repositories = createRepositories(supabase);
    const systemSettingsService = new SystemSettingsService(repositories);
    await systemSettingsService.updateSetting(key, value, owner.id);
    revalidatePath("/admin/configuracoes");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atualizar a configuração." };
  }
}
