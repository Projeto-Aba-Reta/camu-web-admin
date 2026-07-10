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
import { deleteSubRoleAction } from "@/app/(dashboard)/admin/roles/actions";
import type { SubRole } from "@/types/auth";

interface DeleteSubRoleDialogProps {
  subRole: Pick<SubRole, "id" | "name" | "roleId">;
  trigger: ReactNode;
}

export function DeleteSubRoleDialog({ subRole, trigger }: DeleteSubRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteSubRoleAction(subRole.id, subRole.roleId);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível excluir a sub-role.");
        return;
      }
      toast.success(`Sub-role "${subRole.name}" excluída.`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sub-role &quot;{subRole.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Usuários com essa sub-role atribuída perdem esse acesso específico. Esta ação não
            pode ser desfeita.
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
