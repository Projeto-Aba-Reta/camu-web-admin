"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { resendInviteAction, cancelInviteAction } from "@/app/(dashboard)/admin/convites-sessoes/actions";

export interface PendingInvite {
  id: string;
  email: string;
  fullName: string | null;
}

interface PendingInvitesTableProps {
  invites: PendingInvite[];
}

export function PendingInvitesTable({ invites }: PendingInvitesTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleResend(invite: PendingInvite) {
    setPendingId(invite.id);
    const result = await resendInviteAction(invite.id, invite.email, invite.fullName);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível reenviar o convite.");
      return;
    }
    toast.success("Convite reenviado.");
    router.refresh();
  }

  async function handleCancel(invite: PendingInvite) {
    setPendingId(invite.id);
    const result = await cancelInviteAction(invite.id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível cancelar o convite.");
      return;
    }
    toast.success("Convite cancelado.");
    router.refresh();
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>E-mail</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.length ? (
            invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell className="text-muted-foreground">
                  {invite.fullName ?? "—"}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === invite.id}
                    onClick={() => handleResend(invite)}
                  >
                    <Mail className="size-4" />
                    Reenviar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={pendingId === invite.id}>
                        <X className="size-4" />
                        Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar convite</AlertDialogTitle>
                        <AlertDialogDescription>
                          O convite de {invite.email} será cancelado e o usuário não poderá mais
                          finalizar o cadastro com este link.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCancel(invite)}>
                          Cancelar convite
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                Nenhum convite pendente.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
