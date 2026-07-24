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
import { Switch } from "@/components/ui/switch";
import { saleOriginFormSchema, type SaleOriginFormValues } from "@/lib/validation/vendas-schemas";
import { createSaleOriginAction, updateSaleOriginAction } from "@/app/(dashboard)/vendas/actions";
import type { SaleOrigin } from "@/types/vendas";

interface SaleOriginFormProps {
  origin?: SaleOrigin;
}

export function SaleOriginForm({ origin }: SaleOriginFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = origin !== undefined;

  const defaults: SaleOriginFormValues = {
    name: origin?.name ?? "",
    requiresSeller: origin?.requiresSeller ?? false,
  };

  const form = useForm<SaleOriginFormValues>({
    resolver: zodResolver(saleOriginFormSchema),
    defaultValues: defaults,
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) form.reset(defaults);
    setOpen(nextOpen);
  }

  async function onSubmit(values: SaleOriginFormValues) {
    const result = isEditing
      ? await updateSaleOriginAction(origin.id, values)
      : await createSaleOriginAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a origem.");
      return;
    }

    toast.success(isEditing ? "Origem atualizada." : "Origem criada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="ghost" size="sm">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="size-4" />
            Nova origem
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar origem" : "Nova origem de venda"}</DialogTitle>
          <DialogDescription>
            Como a Camu conseguiu a venda. Origens que respondem a &quot;quem vendeu?&quot; — como
            boca-a-boca e indicação — devem exigir o vendedor responsável.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: Feira de artesanato do bairro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiresSeller"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div>
                    <FormLabel>Exige vendedor responsável</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Pedidos com esta origem só são aceitos com alguém do time informado como quem
                      vendeu. Pedidos antigos não são afetados.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? "Salvar" : "Criar origem"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
