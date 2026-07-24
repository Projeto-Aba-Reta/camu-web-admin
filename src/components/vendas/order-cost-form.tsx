"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDER_COST_CATEGORY_LABEL } from "@/components/vendas/labels";
import {
  formatCentsToInput,
  orderCostFormSchema,
  parseCurrencyToCents,
  type OrderCostFormValues,
} from "@/lib/validation/vendas-schemas";
import { createOrderCostAction, updateOrderCostAction } from "@/app/(dashboard)/vendas/actions";
import { ORDER_COST_CATEGORIES, type OrderCost } from "@/types/vendas";

interface OrderCostFormProps {
  orderId: string;
  // Ausente = novo lançamento. Presente = correção de um lançamento.
  cost?: OrderCost;
}

export function OrderCostForm({ orderId, cost }: OrderCostFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = cost !== undefined;

  const form = useForm<OrderCostFormValues>({
    resolver: zodResolver(orderCostFormSchema),
    defaultValues: {
      amount: cost ? formatCentsToInput(cost.amountCents) : "",
      category: cost?.category ?? "filamento",
      description: cost?.description ?? "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        amount: cost ? formatCentsToInput(cost.amountCents) : "",
        category: cost?.category ?? "filamento",
        description: cost?.description ?? "",
      });
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: OrderCostFormValues) {
    const payload = {
      amountCents: parseCurrencyToCents(values.amount) ?? 0,
      category: values.category,
      description: values.description.trim() === "" ? null : values.description.trim(),
    };

    const result = isEditing
      ? await updateOrderCostAction(cost.id, payload)
      : await createOrderCostAction({ orderId, ...payload });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o custo.");
      return;
    }

    toast.success(isEditing ? "Custo atualizado." : "Custo lançado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="ghost" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-4" />
            Lançar custo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar custo" : "Lançar custo"}</DialogTitle>
          <DialogDescription>
            Quanto de fato se gastou neste pedido. Cada área lança a sua parte — o custo do pedido é
            a soma dos lançamentos. Para desfazer, edite ou exclua o lançamento (não existe valor
            negativo).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="14,50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORDER_COST_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {ORDER_COST_CATEGORY_LABEL[category]}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: cola quente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? "Salvar" : "Lançar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
