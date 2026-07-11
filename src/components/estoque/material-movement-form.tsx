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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATERIAL_MOVEMENT_TYPE_LABEL } from "@/components/estoque/constants";
import { materialMovementFormSchema, type MaterialMovementFormValues } from "@/lib/validation/inventory-schemas";
import { registerMaterialMovementAction } from "@/app/(dashboard)/producao/estoque/actions";
import type { Material, MaterialMovementType } from "@/types/inventory";
import type { Printer } from "@/types/pricing";
import type { Product } from "@/types/catalog";

interface MaterialMovementFormProps {
  material: Material;
  printers: Printer[];
  products: Product[];
}

const DEFAULT_VALUES: MaterialMovementFormValues = {
  movementType: "compra",
  quantity: 0,
  printerId: "",
  productId: "",
  producedQuantity: 0,
  notes: "",
};

export function MaterialMovementForm({ material, printers, products }: MaterialMovementFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof materialMovementFormSchema>, unknown, MaterialMovementFormValues>({
    resolver: zodResolver(materialMovementFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const movementType = form.watch("movementType") as MaterialMovementType;
  const productId = form.watch("productId");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(DEFAULT_VALUES);
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: MaterialMovementFormValues) {
    // A UI normaliza o sinal por tipo (ver inventory-schemas.ts); só
    // ajuste_manual preserva o sinal informado pelo usuário.
    let signedQuantity = values.quantity;
    if (values.movementType === "compra") {
      signedQuantity = Math.abs(values.quantity);
    } else if (values.movementType === "perda_refugo" || values.movementType === "consumo_producao") {
      signedQuantity = -Math.abs(values.quantity);
    }

    const result = await registerMaterialMovementAction({
      materialId: material.id,
      movementType: values.movementType,
      quantity: signedQuantity,
      printerId: values.movementType === "consumo_producao" ? values.printerId || null : null,
      productId: values.movementType === "consumo_producao" ? values.productId || null : null,
      producedQuantity:
        values.movementType === "consumo_producao" && values.productId ? values.producedQuantity ?? null : null,
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
          <DialogTitle>Registrar movimentação — {material.name}</DialogTitle>
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
                      {Object.entries(MATERIAL_MOVEMENT_TYPE_LABEL).map(([value, label]) => (
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
                    Quantidade ({material.unit})
                    {movementType === "ajuste_manual" && " — positiva para acrescentar, negativa para remover"}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {movementType === "consumo_producao" && (
              <>
                <FormField
                  control={form.control}
                  name="printerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impressora (opcional)</FormLabel>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Nenhuma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {printers.map((printer) => (
                            <SelectItem key={printer.id} value={printer.id}>
                              {printer.name}
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
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peça produzida (opcional)</FormLabel>
                      <FormDescription>
                        Informar a peça também registra a entrada dela no estoque de peças prontas, no mesmo
                        lançamento.
                      </FormDescription>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Nenhuma — produção ainda em andamento" />
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

                {productId && (
                  <FormField
                    control={form.control}
                    name="producedQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade de peças produzidas</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" step="1" {...field} value={field.value as number | string} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

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
