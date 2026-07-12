"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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
import { slicingSheetFormSchema, type SlicingSheetFormValues } from "@/lib/validation/slicing-sheet-schemas";
import { upsertSlicingSheetAction } from "@/app/(dashboard)/producao/catalogo/actions";
import type { Material } from "@/types/inventory";
import type { Printer } from "@/types/pricing";
import type { SlicingSheet } from "@/types/slicing-sheet";

interface SlicingSheetFormProps {
  productId: string;
  printers: Printer[];
  materials: Material[];
  existingSheet?: SlicingSheet;
  trigger: ReactNode;
}

type DurationUnit = "horas" | "minutos";

function toDefaultValues(sheet?: SlicingSheet): SlicingSheetFormValues {
  if (!sheet) {
    return {
      printerId: "",
      printHours: 1,
      materials: [{ materialId: "", pieceGrams: 0, supportGrams: 0 }],
    };
  }
  return {
    printerId: sheet.printerId,
    printHours: sheet.printHours,
    materials: sheet.materials.map((material) => ({
      materialId: material.materialId,
      pieceGrams: material.pieceGrams,
      supportGrams: material.supportGrams,
    })),
  };
}

// O banco sempre guarda print_hours em horas (ver migration
// ficha_de_fatiamento) — a unidade de exibição/digitação é só uma
// conveniência de UI para impressões rápidas (minutos), convertida na hora
// de ler/escrever o campo do formulário.
function hoursToDisplayValue(hours: number, unit: DurationUnit): number {
  if (Number.isNaN(hours)) return 0;
  return unit === "minutos" ? Math.round(hours * 60 * 100) / 100 : hours;
}

function displayValueToHours(value: number, unit: DurationUnit): number {
  if (Number.isNaN(value)) return 0;
  return unit === "minutos" ? value / 60 : value;
}

export function SlicingSheetForm({ productId, printers, materials, existingSheet, trigger }: SlicingSheetFormProps) {
  const [open, setOpen] = useState(false);
  // Pré-seleciona minutos para tempos já cadastrados abaixo de 1h (impressão
  // rápida) — só afeta a unidade exibida, o valor salvo continua em horas.
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(
    existingSheet && existingSheet.printHours < 1 ? "minutos" : "horas",
  );
  const router = useRouter();

  const form = useForm<z.input<typeof slicingSheetFormSchema>, unknown, SlicingSheetFormValues>({
    resolver: zodResolver(slicingSheetFormSchema),
    defaultValues: toDefaultValues(existingSheet),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "materials" });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(toDefaultValues(existingSheet));
      setDurationUnit(existingSheet && existingSheet.printHours < 1 ? "minutos" : "horas");
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: SlicingSheetFormValues) {
    const result = await upsertSlicingSheetAction(productId, values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a ficha de fatiamento.");
      return;
    }

    toast.success("Ficha de fatiamento salva.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{existingSheet ? "Editar ficha de fatiamento" : "Nova ficha de fatiamento"}</DialogTitle>
          <DialogDescription>
            Preencha com os números exatos exibidos pela fatiadora para esta peça e impressora. Salvar substitui
            integralmente os dados anteriores desta combinação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="printerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impressora</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={Boolean(existingSheet)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma impressora" />
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
              name="printHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tempo de impressão</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={hoursToDisplayValue(field.value as number, durationUnit)}
                        onChange={(e) => field.onChange(displayValueToHours(e.target.valueAsNumber, durationUnit))}
                      />
                    </FormControl>
                    <Select value={durationUnit} onValueChange={(value) => setDurationUnit(value as DurationUnit)}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horas">horas</SelectItem>
                        <SelectItem value="minutos">minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Filamentos usados</FormLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ materialId: "", pieceGrams: 0, supportGrams: 0 })}
                >
                  <Plus className="size-4" />
                  Adicionar filamento
                </Button>
              </div>

              {fields.map((fieldItem, index) => (
                <div
                  key={fieldItem.id}
                  className="grid grid-cols-[1fr_repeat(2,6rem)_auto] items-end gap-2 rounded-md border p-3"
                >
                  <FormField
                    control={form.control}
                    name={`materials.${index}.materialId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material</FormLabel>
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name}
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
                    name={`materials.${index}.pieceGrams`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peça (g)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.1" {...field} value={field.value as number | string} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`materials.${index}.supportGrams`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suporte (g)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.1" {...field} value={field.value as number | string} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {form.formState.errors.materials?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.materials.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Salvar ficha
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
