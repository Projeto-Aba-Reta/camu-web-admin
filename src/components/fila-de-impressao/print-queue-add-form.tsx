"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addToQueueFormSchema, type AddToQueueFormValues } from "@/lib/validation/print-queue-schemas";
import { addToQueueAction } from "@/app/(dashboard)/producao/fila-de-impressao/actions";
import type { Product } from "@/types/catalog";

interface PrintQueueAddFormProps {
  products: Product[];
}

const DEFAULT_VALUES: AddToQueueFormValues = {
  productId: "",
  quantity: 1,
};

export function PrintQueueAddForm({ products }: PrintQueueAddFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof addToQueueFormSchema>, unknown, AddToQueueFormValues>({
    resolver: zodResolver(addToQueueFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(DEFAULT_VALUES);
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: AddToQueueFormValues) {
    const result = await addToQueueAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível adicionar o item à fila.");
      return;
    }

    toast.success("Item adicionado à fila.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Plus className="size-4" />
          Adicionar à fila
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à fila de impressão</DialogTitle>
          <DialogDescription>
            Apenas produtos do catálogo com uma ficha de fatiamento cadastrada (para pelo menos uma impressora)
            podem entrar na fila. Os materiais consumidos são derivados dessa ficha ao iniciar a impressão.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
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
                  <FormLabel>Quantidade</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" step="1" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Adicionar à fila
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
