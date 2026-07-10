"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubRoleForm } from "@/components/admin/sub-role-form";
import { DeleteSubRoleDialog } from "@/components/admin/delete-sub-role-dialog";
import type { SubRole } from "@/types/auth";

interface SubRolesListProps {
  roleId: string;
  subRoles: SubRole[];
}

export function SubRolesList({ roleId, subRoles }: SubRolesListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {subRoles.length ? (
            subRoles.map((subRole) => (
              <TableRow key={subRole.id}>
                <TableCell className="font-medium">{subRole.name}</TableCell>
                <TableCell className="text-muted-foreground">{subRole.slug}</TableCell>
                <TableCell className="text-muted-foreground">
                  {subRole.description ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <SubRoleForm
                      mode="edit"
                      roleId={roleId}
                      subRole={subRole}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="size-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      }
                    />
                    <DeleteSubRoleDialog
                      subRole={subRole}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="text-destructive">
                          <Trash2 className="size-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Nenhuma sub-role cadastrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
