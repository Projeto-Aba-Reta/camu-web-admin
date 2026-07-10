import { notFound } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { RoleService } from "@/lib/services/role-service";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RoleForm } from "@/components/admin/role-form";
import { SubRoleForm } from "@/components/admin/sub-role-form";
import { SubRolesList } from "@/components/admin/sub-roles-list";

interface RoleDetailPageProps {
  params: Promise<{ roleId: string }>;
}

export default async function RoleDetailPage({ params }: RoleDetailPageProps) {
  const { roleId } = await params;

  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const roleService = new RoleService(repositories);

  const role = await roleService.getRole(roleId);
  if (!role) notFound();

  const subRoles = await roleService.listSubRoles(roleId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={role.name}
        description={role.description ?? `Slug: ${role.slug}`}
        action={
          <RoleForm
            mode="edit"
            role={role}
            trigger={
              <Button variant="outline">
                <Pencil className="size-4" />
                Editar role
              </Button>
            }
          />
        }
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Sub-roles</h2>
          <SubRoleForm
            mode="create"
            roleId={role.id}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                Nova sub-role
              </Button>
            }
          />
        </div>

        <SubRolesList roleId={role.id} subRoles={subRoles} />
      </div>
    </div>
  );
}
