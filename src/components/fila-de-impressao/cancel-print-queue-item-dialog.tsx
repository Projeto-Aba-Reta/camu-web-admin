"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { cancelPrintQueueItemAction } from "@/app/(dashboard)/producao/fila-de-impressao/actions";
import type { Product } from "@/types/catalog";
import type { PrintQueueItem } from "@/types/print-queue";

interface CancelPrintQueueItemDialogProps {
  item: PrintQueueItem;
  product: Product;
}

export function CancelPrintQueueItemDialog({ item, product }: CancelPrintQueueItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelPrintQueueItemAction(item.id);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível cancelar o item.");
        return;
      }
      toast.success("Item cancelado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <X className="size-4" />
          Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar item — {product.name}</AlertDialogTitle>
          <AlertDialogDescription>
            {item.status === "imprimindo"
              ? "A impressora associada volta a ficar disponível. Nenhuma movimentação de estoque é gerada."
              : "Nenhuma movimentação de estoque é gerada."}{" "}
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Cancelar item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
