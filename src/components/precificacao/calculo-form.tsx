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
import { ResultadoCalculo } from "@/components/shared/resultado-calculo";
import type { Product } from "@/types/catalog";
import type {
  PriceCalculation,
  PriceCalculationResult,
  Printer,
  SizeTier,
  SizeTierDefinition,
} from "@/types/pricing";

interface CalculoFormProps {
  printers: Printer[];
  // Portes cadastrados, para o resultado resolver o rótulo do porte sugerido.
  tiers: SizeTierDefinition[];
  // Peças simples com ficha de fatiamento potencialmente cadastrada — ao
  // selecionar uma, peso/tempo deixam de ser exigidos e o motor deriva os
  // dois valores da ficha da combinação peça+impressora (ver Requirement
  // "Formulário de cálculo a partir de peso e tempo do fatiador"). Omitir
  // esta prop desativa a opção (ex.: cadastro de peça nova, que ainda não
  // existe para ter uma ficha vinculada).
  products?: Product[];
  // Reaproveitado pelo formulário de peça do catálogo (ver catalogo-telas,
  // design.md decisão 1) para capturar o cálculo recém-salvo e vinculá-lo
  // à peça sem duplicar a lógica de cálculo.
  onCalculated?: (calculation: PriceCalculation) => void;
}

export function CalculoForm({ printers, tiers, products = [], onCalculated }: CalculoFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<PriceCalculationResult | PriceCalculation | null>(null);
  const [saved, setSaved] = useState(false);
  const [isResolvingTier, setIsResolvingTier] = useState(false);
  const [lastInput, setLastInput] = useState<CalculoFormValues | null>(null);

  const form = useForm<z.input<typeof calculoFormSchema>, unknown, CalculoFormValues>({
    resolver: zodResolver(calculoFormSchema),
    defaultValues: { weightGrams: "", printHours: "", printerId: "", productId: "" },
  });

  const usingSlicingSheet = Boolean(form.watch("productId"));

  async function onSubmit(values: CalculoFormValues) {
    setResult(null);
    setSaved(false);
    setLastInput(values);

    const response = await calculatePriceAction({
      ...values,
      productId: values.productId || undefined,
      weightGrams: values.productId ? undefined : values.weightGrams,
      printHours: values.productId ? undefined : values.printHours,
    });
    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível calcular o preço.");
      return;
    }

    setResult(response.result ?? null);
    setSaved(Boolean(response.saved));
    if (response.saved) {
      toast.success("Cálculo salvo no histórico.");
      router.refresh();
      if (response.result) onCalculated?.(response.result as PriceCalculation);
    }
  }

  // O porte escolhido muda a margem aplicada, não só o rótulo: a action
  // recalcula e devolve os preços da faixa escolhida, que substituem os do
  // preview ambíguo aqui na tela.
  async function onChooseTier(tier: SizeTier) {
    if (!lastInput) return;
    setIsResolvingTier(true);
    const response = await calculatePriceAction({
      ...lastInput,
      productId: lastInput.productId || undefined,
      weightGrams: lastInput.productId ? undefined : lastInput.weightGrams,
      printHours: lastInput.productId ? undefined : lastInput.printHours,
      chosenTier: tier,
    });
    setIsResolvingTier(false);

    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível salvar o cálculo.");
      return;
    }

    setResult(response.result ?? null);
    setSaved(Boolean(response.saved));
    toast.success("Cálculo salvo no histórico.");
    router.refresh();
    if (response.result) onCalculated?.(response.result as PriceCalculation);
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-4 sm:items-end">
          {products.length > 0 && (
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="sm:col-span-4">
                  <FormLabel>Peça (opcional — usa a ficha de fatiamento cadastrada)</FormLabel>
                  <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Nenhuma — digitar peso e tempo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma — digitar peso e tempo</SelectItem>
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
          )}

          <FormField
            control={form.control}
            name="weightGrams"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    disabled={usingSlicingSheet}
                    placeholder={usingSlicingSheet ? "Lido da ficha de fatiamento" : undefined}
                    {...field}
                    value={field.value as number | string}
                  />
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
                  <Input
                    type="number"
                    step="0.1"
                    disabled={usingSlicingSheet}
                    placeholder={usingSlicingSheet ? "Lido da ficha de fatiamento" : undefined}
                    {...field}
                    value={field.value as number | string}
                  />
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
          tiers={tiers}
        />
      )}
    </div>
  );
}
