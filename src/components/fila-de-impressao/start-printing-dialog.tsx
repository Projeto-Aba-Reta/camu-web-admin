"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Play } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startPrintingFormSchema, type StartPrintingFormValues } from "@/lib/validation/print-queue-schemas";
import { startPrintingAction } from "@/app/(dashboard)/producao/fila-de-impressao/actions";
import type { Product } from "@/types/catalog";
import type { Printer } from "@/types/pricing";
import type { PrintQueueItem } from "@/types/print-queue";

interface StartPrintingDialogProps {
  item: PrintQueueItem;
  product: Product;
  printers: Printer[];
  occupiedPrinterIds: Set<string>;
}

export function StartPrintingDialog({ item, product, printers, occupiedPrinterIds }: StartPrintingDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Pré-seleciona a impressora ociosa quando existe exatamente uma — ver
  // Requirement "Uma única impressora ativa está ociosa". Impressoras
  // ocupadas ficam desabilitadas na lista, evitando a tentativa que o
  // service rejeitaria de qualquer forma (ver Requirement "Impressora já
  // ocupada").
  const idlePrinters = useMemo(
    () => printers.filter((printer) => !occupiedPrinterIds.has(printer.id)),
    [printers, occupiedPrinterIds],
  );
  const defaultPrinterId = idlePrinters.length === 1 ? idlePrinters[0].id : "";

  const form = useForm<z.input<typeof startPrintingFormSchema>, unknown, StartPrintingFormValues>({
    resolver: zodResolver(startPrintingFormSchema),
    defaultValues: { printerId: defaultPrinterId },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ printerId: defaultPrinterId });
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: StartPrintingFormValues) {
    const result = await startPrintingAction(item.id, values.printerId);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível iniciar a impressão.");
      return;
    }

    toast.success("Impressão iniciada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" disabled={printers.length === 0}>
          <Play className="size-4" />
          Iniciar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar impressão — {product.name}</DialogTitle>
          <DialogDescription>
            {idlePrinters.length > 0
              ? "Selecione a impressora que vai imprimir este item."
              : "Nenhuma impressora ativa está ociosa no momento — selecione uma para substituir a impressão atual assim que ela terminar, ou aguarde."}
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
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma impressora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {printers.map((printer) => (
                        <SelectItem
                          key={printer.id}
                          value={printer.id}
                          disabled={occupiedPrinterIds.has(printer.id)}
                        >
                          {printer.name}
                          {occupiedPrinterIds.has(printer.id) && " (ocupada)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Iniciar impressão
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
