import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { RoleService } from "@/lib/services/role-service";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RoleForm } from "@/components/admin/role-form";
import { RolesTable } from "@/components/admin/roles-table";

export default async function AdminRolesPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const roleService = new RoleService(repositories);

  const roles = await roleService.listRolesWithCounts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Áreas de negócio e suas sub-roles."
        action={
          <RoleForm
            mode="create"
            trigger={
              <Button>
                <Plus className="size-4" />
                Nova role
              </Button>
            }
          />
        }
      />

      <RolesTable roles={roles} />
    </div>
  );
}
