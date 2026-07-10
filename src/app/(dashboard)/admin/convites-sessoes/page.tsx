import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { UserService } from "@/lib/services/user-service";
import { PageHeader } from "@/components/layout/page-header";
import { PendingInvitesTable } from "@/components/admin/pending-invites-table";

export default async function AdminInvitesSessionsPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const userService = new UserService(repositories);

  const users = await userService.listUsers();
  const invites = users
    .filter((user) => user.status === "invited")
    .map((user) => ({ id: user.id, email: user.email, fullName: user.fullName }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Convites & Sessões"
        description="Reenvie ou cancele convites pendentes. Para revogar sessões ativas de um usuário, acesse o detalhe dele em Usuários."
      />

      <PendingInvitesTable invites={invites} />
    </div>
  );
}
