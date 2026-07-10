"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteRoleAction } from "@/app/(dashboard)/admin/roles/actions";
import type { RoleWithCounts } from "@/lib/services/role-service";

interface DeleteRoleDialogProps {
  role: Pick<RoleWithCounts, "id" | "name" | "subRoleCount" | "userCount">;
  trigger: ReactNode;
}

export function DeleteRoleDialog({ role, trigger }: DeleteRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteRoleAction(role.id);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível excluir a role.");
        return;
      }
      toast.success(`Role "${role.name}" excluída.`);
      setOpen(false);
      router.refresh();
    });
  }

  const hasImpact = role.subRoleCount > 0 || role.userCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir role &quot;{role.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasImpact ? (
              <>
                Isso também removerá em cascata{" "}
                {role.subRoleCount > 0 && (
                  <>
                    {role.subRoleCount} sub-role{role.subRoleCount > 1 ? "s" : ""}
                  </>
                )}
                {role.subRoleCount > 0 && role.userCount > 0 && " e "}
                {role.userCount > 0 && (
                  <>
                    {role.userCount} atribuição{role.userCount > 1 ? "ões" : ""} de usuário
                  </>
                )}
                . Os usuários afetados deixarão de ver essa área na sidebar. Esta ação não pode
                ser desfeita.
              </>
            ) : (
              "Esta ação não pode ser desfeita."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
