"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { revokeSessionsAction } from "@/app/(dashboard)/admin/convites-sessoes/actions";

interface RevokeSessionsDialogProps {
  userId: string;
}

export function RevokeSessionsDialog({ userId }: RevokeSessionsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setIsSubmitting(true);
    const result = await revokeSessionsAction(userId);
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível revogar as sessões.");
      return;
    }

    toast.success("Sessões revogadas. O usuário precisará fazer login novamente.");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <LogOut className="size-4" />
          Revogar sessões
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revogar sessões ativas?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso invalida as sessões ativas deste usuário; ele precisará fazer login novamente na
            próxima renovação do token.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            Revogar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
