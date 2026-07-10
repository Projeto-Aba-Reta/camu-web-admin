import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { GovernanceService } from "@/lib/services/governance-service";
import { UserService } from "@/lib/services/user-service";
import { ProfitSplitForm } from "@/components/societario/profit-split-form";
import { CapitalContributionForm } from "@/components/societario/capital-contribution-form";

export default async function AcordoSociedadePage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const governanceService = new GovernanceService(repositories);
  const userService = new UserService(repositories);

  const [currentAgreement, agreementHistory, contributions, users] = await Promise.all([
    governanceService.getCurrentPartnershipAgreement(),
    governanceService.listPartnershipAgreementHistory(),
    governanceService.listCapitalContributions(),
    userService.listUsers(),
  ]);

  const partners = users.filter((user) => user.userType === "owner" || user.userType === "socio");

  return (
    <div className="space-y-8">
      <ProfitSplitForm current={currentAgreement} history={agreementHistory} />
      <CapitalContributionForm contributions={contributions} partners={partners} />
    </div>
  );
}
