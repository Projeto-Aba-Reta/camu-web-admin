import Link from "next/link";
import { Users, Shield, FileText, Settings, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { UserService } from "@/lib/services/user-service";
import { RoleService } from "@/lib/services/role-service";
import { PageHeader } from "@/components/layout/page-header";

const USER_TYPE_LABEL: Record<string, string> = {
  owner: "Owner",
  socio: "Sócio",
  member: "Member",
};

const SHORTCUTS = [
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/auditoria", label: "Auditoria", icon: FileText },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { href: "/admin/convites-sessoes", label: "Convites & Sessões", icon: Mail },
];

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const userService = new UserService(repositories);
  const roleService = new RoleService(repositories);

  const [users, roles] = await Promise.all([userService.listUsers(), roleService.listRoles()]);

  const usersByType = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.userType] = (acc[user.userType] ?? 0) + 1;
    return acc;
  }, {});
  const pendingInvites = users.filter((user) => user.status === "invited").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel administrativo"
        description="Visão geral e atalhos para a gestão exclusiva do Owner."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["owner", "socio", "member"] as const).map((type) => (
          <div key={type} className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{USER_TYPE_LABEL[type]}s</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {usersByType[type] ?? 0}
            </p>
          </div>
        ))}
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">Convites pendentes</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{pendingInvites}</p>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <p className="text-sm text-muted-foreground">Roles cadastradas</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{roles.length}</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Atalhos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md border p-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
