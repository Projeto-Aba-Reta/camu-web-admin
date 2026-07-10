import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { UserService } from "@/lib/services/user-service";
import { PageHeader } from "@/components/layout/page-header";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const userService = new UserService(repositories);

  const users = await userService.listUsersWithRoles();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Convide pessoas e gerencie tipo de acesso e roles atribuídas."
        action={<InviteUserForm />}
      />

      <UsersTable users={users} />
    </div>
  );
}
