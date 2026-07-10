"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeUserTypeAction } from "@/app/(dashboard)/admin/usuarios/actions";
import type { UserType } from "@/types/auth";

const USER_TYPE_LABEL: Record<UserType, string> = {
  owner: "Owner",
  socio: "Sócio",
  member: "Member",
};

interface ChangeUserTypeDialogProps {
  userId: string;
  currentType: UserType;
}

export function ChangeUserTypeDialog({ userId, currentType }: ChangeUserTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserType>(currentType);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelected(currentType);
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    const result = await changeUserTypeAction(userId, selected);
    setIsSubmitting(false);

    if (!result.ok) {
      const message = result.error ?? "Não foi possível alterar o tipo do usuário.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Tipo de usuário atualizado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ShieldAlert className="size-4" />
          Alterar tipo de usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar tipo de usuário</DialogTitle>
          <DialogDescription>
            Isso muda o nível de acesso do usuário no sistema. Owner tem bypass total de RLS —
            só altere se tiver certeza.
          </DialogDescription>
        </DialogHeader>

        <Select value={selected} onValueChange={(value) => setSelected(value as UserType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">{USER_TYPE_LABEL.owner}</SelectItem>
            <SelectItem value="socio">{USER_TYPE_LABEL.socio}</SelectItem>
            <SelectItem value="member">{USER_TYPE_LABEL.member}</SelectItem>
          </SelectContent>
        </Select>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || selected === currentType}
          >
            Confirmar alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
