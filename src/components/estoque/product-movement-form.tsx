"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import type { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_MOVEMENT_TYPE_LABEL } from "@/components/estoque/constants";
import { productMovementFormSchema, type ProductMovementFormValues } from "@/lib/validation/inventory-schemas";
import { registerProductMovementAction } from "@/app/(dashboard)/producao/estoque/actions";
import type { Product } from "@/types/catalog";
import type { ProductMovementType } from "@/types/inventory";

interface ProductMovementFormProps {
  product: Product;
}

const DEFAULT_VALUES: ProductMovementFormValues = {
  movementType: "producao",
  quantity: 0,
  notes: "",
};

export function ProductMovementForm({ product }: ProductMovementFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof productMovementFormSchema>, unknown, ProductMovementFormValues>({
    resolver: zodResolver(productMovementFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const movementType = form.watch("movementType") as ProductMovementType;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(DEFAULT_VALUES);
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: ProductMovementFormValues) {
    let signedQuantity = values.quantity;
    if (values.movementType === "producao") {
      signedQuantity = Math.abs(values.quantity);
    } else if (values.movementType === "venda" || values.movementType === "perda") {
      signedQuantity = -Math.abs(values.quantity);
    }

    const result = await registerProductMovementAction({
      productId: product.id,
      movementType: values.movementType,
      quantity: signedQuantity,
      notes: values.notes?.trim() || null,
    });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível registrar a movimentação.");
      return;
    }

    toast.success("Movimentação registrada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <PackagePlus className="size-4" />
          Movimentar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar movimentação — {product.name}</DialogTitle>
          <DialogDescription>
            Não é possível editar uma movimentação já registrada. Para corrigir um lançamento incorreto, registre um
            ajuste manual explicando o motivo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movementType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRODUCT_MOVEMENT_TYPE_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantidade
                    {movementType === "ajuste_manual" && " — positiva para acrescentar, negativa para remover"}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="1" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota {movementType === "ajuste_manual" ? "(obrigatória)" : "(opcional)"}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Registrar movimentação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
