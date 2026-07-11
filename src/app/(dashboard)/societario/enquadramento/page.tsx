import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { GovernanceService } from "@/lib/services/governance-service";
import { UserService } from "@/lib/services/user-service";
import { LegalStatusForm } from "@/components/societario/legal-status-form";
import { MigrationTriggerPanel } from "@/components/societario/migration-trigger-panel";

export default async function EnquadramentoJuridicoPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const governanceService = new GovernanceService(repositories);
  const userService = new UserService(repositories);

  const [currentStatus, statusHistory, triggers, users] = await Promise.all([
    governanceService.getCurrentLegalEntityStatus(),
    governanceService.listLegalEntityStatusHistory(),
    governanceService.listMigrationTriggers(),
    userService.listUsers(),
  ]);

  const partners = users.filter((user) => user.userType === "owner" || user.userType === "socio");

  return (
    <div className="space-y-8">
      <LegalStatusForm current={currentStatus} history={statusHistory} partners={partners} />
      <MigrationTriggerPanel triggers={triggers} />
    </div>
  );
}
