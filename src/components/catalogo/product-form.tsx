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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/components/catalogo/constants";
import { CalculoForm } from "@/components/precificacao/calculo-form";
import { ResultadoCalculo } from "@/components/shared/resultado-calculo";
import { PriceCalculationPicker } from "@/components/catalogo/price-calculation-picker";
import type { HistoricoRow } from "@/components/precificacao/historico-tabela";
import { productFormSchema, type ProductFormValues } from "@/lib/validation/catalog-schemas";
import { createProductAction, updateProductAction } from "@/app/(dashboard)/producao/catalogo/actions";
import type { Product } from "@/types/catalog";
import type { PriceCalculation, Printer } from "@/types/pricing";

interface ProductFormProps {
  product?: Product;
  printers: Printer[];
  recentCalculations: HistoricoRow[];
  initialLinkedCalculation: PriceCalculation | null;
  canWrite: boolean;
}

export function ProductForm({
  product,
  printers,
  recentCalculations,
  initialLinkedCalculation,
  canWrite,
}: ProductFormProps) {
  const router = useRouter();
  const [selectedCalculation, setSelectedCalculation] = useState<PriceCalculation | null>(initialLinkedCalculation);
  const [showInlineCalc, setShowInlineCalc] = useState(false);

  const form = useForm<z.input<typeof productFormSchema>, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      category: product?.category ?? "utilitario",
      status: product?.status ?? "rascunho",
    },
  });

  async function onSubmit(values: ProductFormValues) {
    const input = {
      name: values.name,
      description: values.description?.trim() || null,
      category: values.category,
      status: values.status,
    };
    const priceCalculationId = selectedCalculation?.id ?? null;

    const response = product
      ? await updateProductAction(product.id, input, priceCalculationId)
      : await createProductAction(input, priceCalculationId);

    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível salvar a peça.");
      return;
    }

    toast.success(product ? "Peça atualizada." : "Peça cadastrada.");
    const targetId = product?.id ?? ("productId" in response ? response.productId : undefined);
    router.refresh();
    if (targetId && !product) {
      router.push(`/producao/catalogo/${targetId}`);
    }
  }

  return (
    <Form {...form}>
      {/* Não é um <form> real: a seção de precificação reaproveita
          CalculoForm, que já renderiza seu próprio <form>, e HTML não
          permite formulários aninhados. O submit é disparado
          programaticamente pelo botão abaixo. */}
      <div className="space-y-6">
        <fieldset disabled={!canWrite} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
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
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
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
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <h3 className="text-sm font-semibold text-foreground">Precificação</h3>

            {selectedCalculation ? (
              <div className="space-y-3">
                <ResultadoCalculo result={selectedCalculation} saved />
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCalculation(null)}>
                  Trocar cálculo vinculado
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vincule um cálculo de preço já existente do histórico ou calcule um novo sem sair desta tela.
                </p>
                <div className="flex flex-wrap gap-2">
                  <PriceCalculationPicker calculations={recentCalculations} onSelect={setSelectedCalculation} />
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowInlineCalc((value) => !value)}>
                    {showInlineCalc ? "Ocultar cálculo novo" : "Calcular novo preço"}
                  </Button>
                </div>
                {showInlineCalc && (
                  <CalculoForm
                    printers={printers}
                    onCalculated={(calculation) => {
                      setSelectedCalculation(calculation);
                      setShowInlineCalc(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={form.formState.isSubmitting}
          >
            {product ? "Salvar alterações" : "Cadastrar peça"}
          </Button>
        </fieldset>
      </div>

      {!canWrite && (
        <p className="mt-2 text-xs text-muted-foreground">Você tem acesso somente leitura ao catálogo.</p>
      )}
    </Form>
  );
}
