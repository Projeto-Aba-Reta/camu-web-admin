import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { GovernanceService } from "@/lib/services/governance-service";
import { MeiCeilingIndicator } from "@/components/societario/mei-ceiling-indicator";
import { RevenueSnapshotForm } from "@/components/societario/revenue-snapshot-form";

export default async function FaturamentoXTetoPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const governanceService = new GovernanceService(repositories);

  const [ceilingStatus, snapshots] = await Promise.all([
    governanceService.getCeilingStatus(),
    governanceService.listRevenueSnapshots(),
  ]);

  return (
    <div className="space-y-8">
      <MeiCeilingIndicator status={ceilingStatus} />
      <RevenueSnapshotForm snapshots={snapshots} />
    </div>
  );
}
