"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
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
import { completePrintingAction } from "@/app/(dashboard)/producao/fila-de-impressao/actions";
import type { Product } from "@/types/catalog";
import type { PrintQueueItem } from "@/types/print-queue";
import type { PrintQueueMaterialLine } from "@/components/fila-de-impressao/print-queue-board";

interface CompletePrintingDialogProps {
  item: PrintQueueItem;
  product: Product;
  // Snapshot copiado da ficha de fatiamento no início da impressão — uma
  // linha por material consumido (peça + suporte). Ver Requirement
  // "Conclusão de impressão com baixa automática de estoque".
  materials: PrintQueueMaterialLine[];
}

export function CompletePrintingDialog({ item, product, materials }: CompletePrintingDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await completePrintingAction(item.id);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível concluir a impressão.");
        return;
      }
      toast.success("Impressão concluída — estoque atualizado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm">
          <CheckCircle2 className="size-4" />
          Concluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Concluir impressão — {product.name}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>Ao confirmar, o sistema registra automaticamente:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  +{item.quantity} unidade{item.quantity > 1 ? "s" : ""} no estoque de peças prontas de{" "}
                  <span className="font-medium text-foreground">{product.name}</span>
                </li>
                {materials.map((line) => (
                  <li key={line.material.id}>
                    -{(line.pieceGrams + line.supportGrams) * item.quantity} {line.material.unit} no estoque de{" "}
                    <span className="font-medium text-foreground">{line.material.name}</span>
                  </li>
                ))}
              </ul>
              <p>Uma notificação também será enviada ao Slack, se configurado.</p>
            </div>
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
          >
            Confirmar conclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
