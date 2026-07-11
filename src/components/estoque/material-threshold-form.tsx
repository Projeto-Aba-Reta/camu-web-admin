"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
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
import { materialThresholdFormSchema, type MaterialThresholdFormValues } from "@/lib/validation/inventory-schemas";
import { setMaterialStockThresholdAction } from "@/app/(dashboard)/producao/estoque/actions";
import type { Material } from "@/types/inventory";

interface MaterialThresholdFormProps {
  material: Material;
  currentMinimum: number | null;
}

export function MaterialThresholdForm({ material, currentMinimum }: MaterialThresholdFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof materialThresholdFormSchema>, unknown, MaterialThresholdFormValues>({
    resolver: zodResolver(materialThresholdFormSchema),
    defaultValues: { minimumQuantity: currentMinimum ?? 0 },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ minimumQuantity: currentMinimum ?? 0 });
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: MaterialThresholdFormValues) {
    const result = await setMaterialStockThresholdAction({
      materialId: material.id,
      minimumQuantity: values.minimumQuantity,
    });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o limite mínimo.");
      return;
    }

    toast.success("Limite mínimo salvo.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Settings2 className="size-4" />
          Limite mínimo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Limite mínimo — {material.name}</DialogTitle>
          <DialogDescription>
            Abaixo deste saldo, o insumo passa a ser sinalizado como estoque baixo na listagem e no indicador da
            topbar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="minimumQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade mínima ({material.unit})</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" min="0" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Salvar limite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
