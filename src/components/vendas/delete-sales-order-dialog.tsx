"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { deleteSalesOrderAction } from "@/app/(dashboard)/vendas/actions";
import type { SalesOrderWithFinancials } from "@/types/vendas";

interface DeleteSalesOrderDialogProps {
  order: SalesOrderWithFinancials;
}

export function DeleteSalesOrderDialog({ order }: DeleteSalesOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteSalesOrderAction(order.id);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível excluir o pedido.");
        return;
      }
      toast.success("Pedido excluído.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir pedido {order.orderCode}?</AlertDialogTitle>
          {/* A exclusão é em cascata no banco — enumerar o que some é o que
              impede a surpresa depois. */}
          <AlertDialogDescription>
            Saem junto os {order.items.length} item(ns), os {order.financials.costEntries}{" "}
            lançamento(s) de custo e todo o histórico de passagem pelo funil. O pedido também deixa
            de contar no resultado de vendas. Esta ação não pode ser desfeita.
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
            Excluir pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
