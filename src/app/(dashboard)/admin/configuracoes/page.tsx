import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { SystemSettingsService } from "@/lib/services/system-settings-service";
import { PageHeader } from "@/components/layout/page-header";
import { SystemSettingForm } from "@/components/admin/system-setting-form";

const SETTING_LABEL: Record<string, string> = {
  "fundacao.nome": "Nome da Fundação",
  "financeiro.teto_mei_anual_centavos": "Teto de faturamento MEI (centavos/ano)",
  "contato.padrao": "Contato padrão",
};

export default async function AdminSystemSettingsPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const systemSettingsService = new SystemSettingsService(repositories);

  const settings = await systemSettingsService.listSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Parâmetros globais do painel administrativo."
      />

      <div className="divide-y rounded-md border">
        {settings.map((setting) => (
          <div key={setting.key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {SETTING_LABEL[setting.key] ?? setting.key}
              </p>
              <p className="text-sm text-muted-foreground">
                {typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value)}
              </p>
              <p className="text-xs text-muted-foreground">
                Última alteração: {new Date(setting.updatedAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <SystemSettingForm
              settingKey={setting.key}
              label={SETTING_LABEL[setting.key] ?? setting.key}
              value={setting.value}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
