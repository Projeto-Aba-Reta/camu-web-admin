import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { RoleService } from "@/lib/services/role-service";
import { UserService } from "@/lib/services/user-service";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ChangeUserTypeDialog } from "@/components/admin/change-user-type-dialog";
import { RevokeSessionsDialog } from "@/components/admin/revoke-sessions-dialog";
import { UserRoleAssign } from "@/components/admin/user-role-assign";
import type { UserType } from "@/types/auth";

interface UserDetailPageProps {
  params: Promise<{ userId: string }>;
}

const USER_TYPE_LABEL: Record<UserType, string> = {
  owner: "Owner",
  socio: "Sócio",
  member: "Member",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  invited: "Convidado",
  disabled: "Desabilitado",
};

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = await params;

  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const roleService = new RoleService(repositories);
  const userService = new UserService(repositories);

  const user = await userService.getUser(userId);
  if (!user) notFound();

  const [allRoles, userRoles, userSubRoles] = await Promise.all([
    roleService.listRoles(),
    roleService.listRolesForUser(userId),
    repositories.subRoles.findManyForUser(userId),
  ]);

  const rolesWithSubRoles = await Promise.all(
    allRoles.map(async (role) => ({
      role,
      subRoles: await roleService.listSubRoles(role.id),
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.fullName ?? user.email}
        description={user.email}
        action={
          <div className="flex gap-2">
            <RevokeSessionsDialog userId={user.id} />
            <ChangeUserTypeDialog userId={user.id} currentType={user.userType} />
          </div>
        }
      />

      <div className="flex items-center gap-2">
        <Badge variant={user.userType === "owner" ? "default" : "secondary"}>
          {USER_TYPE_LABEL[user.userType]}
        </Badge>
        <Badge variant="outline">{STATUS_LABEL[user.status] ?? user.status}</Badge>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Roles e sub-roles</h2>
        <UserRoleAssign
          userId={user.id}
          rolesWithSubRoles={rolesWithSubRoles}
          userRoleIds={userRoles.map((role) => role.id)}
          userSubRoleIds={userSubRoles.map((subRole) => subRole.id)}
        />
      </div>
    </div>
  );
}
