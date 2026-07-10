"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculoFormSchema, type CalculoFormValues } from "@/lib/validation/pricing-schemas";
import { calculatePriceAction } from "@/app/(dashboard)/financeiro/precificacao/actions";
import { ResultadoCalculo } from "@/components/precificacao/resultado-calculo";
import type { PriceCalculation, PriceCalculationResult, Printer, SizeTier } from "@/types/pricing";

interface CalculoFormProps {
  printers: Printer[];
}

export function CalculoForm({ printers }: CalculoFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<PriceCalculationResult | PriceCalculation | null>(null);
  const [saved, setSaved] = useState(false);
  const [isResolvingTier, setIsResolvingTier] = useState(false);
  const [lastInput, setLastInput] = useState<CalculoFormValues | null>(null);

  const form = useForm<z.input<typeof calculoFormSchema>, unknown, CalculoFormValues>({
    resolver: zodResolver(calculoFormSchema),
    defaultValues: { weightGrams: 0, printHours: 0, printerId: "" },
  });

  async function onSubmit(values: CalculoFormValues) {
    setResult(null);
    setSaved(false);
    setLastInput(values);

    const response = await calculatePriceAction(values);
    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível calcular o preço.");
      return;
    }

    setResult(response.result ?? null);
    setSaved(Boolean(response.saved));
    if (response.saved) {
      toast.success("Cálculo salvo no histórico.");
      router.refresh();
    }
  }

  async function onChooseTier(tier: SizeTier) {
    if (!lastInput) return;
    setIsResolvingTier(true);
    const response = await calculatePriceAction({ ...lastInput, chosenTier: tier });
    setIsResolvingTier(false);

    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível salvar o cálculo.");
      return;
    }

    setResult(response.result ?? null);
    setSaved(Boolean(response.saved));
    toast.success("Cálculo salvo no histórico.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-4 sm:items-end">
          <FormField
            control={form.control}
            name="weightGrams"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (g)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="printHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tempo de impressão (h)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="printerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Impressora</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
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

          <Button type="submit" disabled={form.formState.isSubmitting || printers.length === 0}>
            Calcular preço
          </Button>
        </form>
      </Form>

      {printers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma impressora ativa cadastrada — cadastre uma na tela de configuração antes de calcular.
        </p>
      )}

      {result && (
        <ResultadoCalculo
          result={result}
          saved={saved}
          isResolvingTier={isResolvingTier}
          onChooseTier={onChooseTier}
        />
      )}
    </div>
  );
}
