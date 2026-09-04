"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  updateCustomerStatusFormSchema,
  type UpdateCustomerStatusFormValues,
} from "@/lib/validation/vendas-schemas";
import { updateCustomerStatusAction } from "@/app/(dashboard)/vendas/actions";
import { customerStatusLabel } from "@/components/vendas/labels";
import { CUSTOMER_ORDER_STATUSES, type CustomerOrderStatus, type SalesOrderWithFinancials } from "@/types/vendas";

interface UpdateCustomerStatusDialogProps {
  order: SalesOrderWithFinancials;
}

export function UpdateCustomerStatusDialog({ order }: UpdateCustomerStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // orders.status é texto livre no banco (o webhook da landing também
  // escreve aqui) — o tipo aceita só o vocabulário, mas o valor gravado pode
  // fugir dele em pedidos antigos; o Select então some sem opção marcada,
  // forçando escolha explícita em vez de assumir um status errado.
  const defaults: UpdateCustomerStatusFormValues = {
    status: order.status as CustomerOrderStatus,
    note: "",
  };

  const form = useForm<UpdateCustomerStatusFormValues>({
    resolver: zodResolver(updateCustomerStatusFormSchema),
    defaultValues: defaults,
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) form.reset(defaults);
    setOpen(nextOpen);
  }

  async function onSubmit(values: UpdateCustomerStatusFormValues) {
    const result = await updateCustomerStatusAction({
      orderId: order.id,
      status: values.status,
      note: values.note.trim() === "" ? null : values.note.trim(),
    });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar o status do cliente.");
      return;
    }

    toast.success("Status de acompanhamento do cliente atualizado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Atualizar status do cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar status do cliente — {order.orderCode}</DialogTitle>
          <DialogDescription>
            Este é o status que o cliente acompanha na página do pedido, separado do funil de produção
            interno. A movimentação é livre, para frente ou para trás.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {customerStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormDescription>O cliente lê esta nota na timeline do pedido.</FormDescription>
                  <FormControl>
                    <Textarea placeholder="ex.: lixando e pintando, sai amanhã" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Atualizar status
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
