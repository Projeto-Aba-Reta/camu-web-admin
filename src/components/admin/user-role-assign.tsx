"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  assignRoleAction,
  assignSubRoleAction,
  unassignRoleAction,
  unassignSubRoleAction,
} from "@/app/(dashboard)/admin/usuarios/actions";
import type { Role, SubRole } from "@/types/auth";

interface RoleWithSubRoles {
  role: Role;
  subRoles: SubRole[];
}

interface UserRoleAssignProps {
  userId: string;
  rolesWithSubRoles: RoleWithSubRoles[];
  userRoleIds: string[];
  userSubRoleIds: string[];
}

export function UserRoleAssign({
  userId,
  rolesWithSubRoles,
  userRoleIds,
  userSubRoleIds,
}: UserRoleAssignProps) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const roleIdSet = new Set(userRoleIds);
  const subRoleIdSet = new Set(userSubRoleIds);

  function withPending(id: string, run: () => Promise<{ ok: boolean; error?: string }>) {
    setPendingIds((prev) => new Set(prev).add(id));
    run()
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error ?? "Não foi possível atualizar.");
          return;
        }
        router.refresh();
      })
      .finally(() => {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
  }

  function toggleRole(roleId: string, checked: boolean) {
    withPending(roleId, () =>
      checked ? assignRoleAction(userId, roleId) : unassignRoleAction(userId, roleId),
    );
  }

  function toggleSubRole(subRoleId: string, checked: boolean) {
    withPending(subRoleId, () =>
      checked ? assignSubRoleAction(userId, subRoleId) : unassignSubRoleAction(userId, subRoleId),
    );
  }

  return (
    <div className="space-y-3">
      {rolesWithSubRoles.map(({ role, subRoles }) => (
        <div key={role.id} className="rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`role-${role.id}`}
              checked={roleIdSet.has(role.id)}
              disabled={pendingIds.has(role.id)}
              onCheckedChange={(checked) => toggleRole(role.id, checked === true)}
            />
            <Label htmlFor={`role-${role.id}`} className="font-medium">
              {role.name}
            </Label>
          </div>

          {subRoles.length > 0 && (
            <div className="mt-2 ml-6 space-y-1.5 border-l border-border pl-4">
              {subRoles.map((subRole) => (
                <div key={subRole.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`subrole-${subRole.id}`}
                    checked={subRoleIdSet.has(subRole.id)}
                    disabled={pendingIds.has(subRole.id)}
                    onCheckedChange={(checked) => toggleSubRole(subRole.id, checked === true)}
                  />
                  <Label
                    htmlFor={`subrole-${subRole.id}`}
                    className="text-sm font-normal text-muted-foreground"
                  >
                    {subRole.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
