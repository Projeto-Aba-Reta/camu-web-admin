"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABEL, PRODUCT_TYPE_LABEL, STATUS_LABEL } from "@/components/catalogo/constants";
import { slugify } from "@/lib/catalog/slug";
import { CalculoForm } from "@/components/precificacao/calculo-form";
import { ResultadoCalculo } from "@/components/shared/resultado-calculo";
import { PriceCalculationPicker } from "@/components/catalogo/price-calculation-picker";
import { useProductSaveSection } from "@/components/catalogo/product-save-bar";
import type { HistoricoRow } from "@/components/precificacao/historico-tabela";
import { leadDaysValue, productFormSchema, type ProductFormValues } from "@/lib/validation/catalog-schemas";
import { createProductAction, updateProductAction } from "@/app/(dashboard)/producao/catalogo/actions";
import type { Product } from "@/types/catalog";
import type { PriceCalculation, Printer, SizeTierDefinition } from "@/types/pricing";

interface ProductFormProps {
  product?: Product;
  printers: Printer[];
  recentCalculations: HistoricoRow[];
  initialLinkedCalculation: PriceCalculation | null;
  // Portes cadastrados, para o resultado e o cálculo inline resolverem rótulos
  // de porte.
  tiers: SizeTierDefinition[];
  // Peça já publicada na loja própria: trocar o slug dela quebra links que já
  // estão no ar, então a troca passa por confirmação.
  publishedOnStore?: boolean;
  canWrite: boolean;
}

export function ProductForm({
  product,
  printers,
  recentCalculations,
  initialLinkedCalculation,
  tiers,
  publishedOnStore = false,
  canWrite,
}: ProductFormProps) {
  const router = useRouter();
  const [selectedCalculation, setSelectedCalculation] = useState<PriceCalculation | null>(initialLinkedCalculation);
  // Último cálculo efetivamente gravado, para saber se a troca de vínculo
  // ainda está pendente (o formulário não controla este campo).
  const [savedCalculationId, setSavedCalculationId] = useState<string | null>(initialLinkedCalculation?.id ?? null);
  const [showInlineCalc, setShowInlineCalc] = useState(false);
  const [pendingSlugChange, setPendingSlugChange] = useState<ProductFormValues | null>(null);
  // Enquanto o usuário não mexer no slug de uma peça nova, ele acompanha o
  // nome; a partir da primeira edição manual, para de ser sobrescrito.
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  const form = useForm<z.input<typeof productFormSchema>, unknown, ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? "",
      category: product?.category ?? "utilitario",
      status: product?.status ?? "rascunho",
      productType: product?.productType ?? "simples",
      productionLeadDaysMin: product?.productionLeadDaysMin?.toString() ?? "",
      productionLeadDaysMax: product?.productionLeadDaysMax?.toString() ?? "",
    },
  });

  async function save(values: ProductFormValues) {
    const input = {
      name: values.name,
      slug: values.slug.trim() || null,
      description: values.description?.trim() || null,
      category: values.category,
      status: values.status,
      productType: values.productType,
      productionLeadDaysMin: leadDaysValue(values.productionLeadDaysMin),
      productionLeadDaysMax: leadDaysValue(values.productionLeadDaysMax),
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
    // Os valores gravados viram a nova referência do formulário: sem isto o
    // bloco continuaria "sujo" e a barra seguiria acusando pendência.
    form.reset(values);
    setSavedCalculationId(priceCalculationId);
    const targetId = product?.id ?? ("productId" in response ? response.productId : undefined);
    router.refresh();
    if (targetId && !product) {
      router.push(`/producao/catalogo/${targetId}`);
    }
  }

  async function onSubmit(values: ProductFormValues) {
    const slugChanged = Boolean(product) && values.slug.trim() !== product?.slug;
    if (slugChanged && publishedOnStore) {
      setPendingSlugChange(values);
      return;
    }
    await save(values);
  }

  const submit = form.handleSubmit(onSubmit, () => {
    toast.error("Revise os campos destacados em Dados da peça.");
  });

  // Peça nova nasce "pendente": o cadastro inteiro ainda está por salvar,
  // mesmo que o usuário não tenha tocado em nenhum campo.
  const isDirty = !product || form.formState.isDirty || (selectedCalculation?.id ?? null) !== savedCalculationId;
  useProductSaveSection("product", "Dados da peça", canWrite && isDirty, submit);

  return (
    <Form {...form}>
      {/* Não é um <form> real: a seção de precificação reaproveita
          CalculoForm, que já renderiza seu próprio <form>, e HTML não
          permite formulários aninhados. O submit é disparado
          programaticamente pela barra de salvar do rodapé (ver
          ProductSaveBar). */}
      <div className="space-y-6">
        <fieldset disabled={!canWrite} className="space-y-6">
          <h3 className="text-sm font-semibold text-foreground">Dados da peça</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        if (!slugTouched) {
                          form.setValue("slug", slugify(event.target.value), { shouldValidate: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Slug (URL na loja)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="gerado a partir do nome"
                      onChange={(event) => {
                        setSlugTouched(true);
                        field.onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Endereço da peça na loja do site: camu.com.br/loja/{field.value || "..."}. Trocar depois quebra
                    os links já publicados.
                  </FormDescription>
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
                  <FormDescription>Este é o texto que o cliente lê na página da peça na loja do site.</FormDescription>
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

            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de peça</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => (
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
              name="productionLeadDaysMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de produção — mínimo (dias)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Em branco: a loja exibe só &quot;feito sob encomenda&quot;.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productionLeadDaysMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de produção — máximo (dias)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <h3 className="text-sm font-semibold text-foreground">Precificação</h3>

            {selectedCalculation ? (
              <div className="space-y-3">
                <ResultadoCalculo result={selectedCalculation} saved tiers={tiers} />
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
                    tiers={tiers}
                    products={product ? [product] : []}
                    onCalculated={(calculation) => {
                      setSelectedCalculation(calculation);
                      setShowInlineCalc(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </fieldset>
      </div>

      {!canWrite && (
        <p className="mt-2 text-xs text-muted-foreground">Você tem acesso somente leitura ao catálogo.</p>
      )}

      {/* Peça no ar: o slug antigo já circula em links, então a troca é
          confirmada explicitamente antes de salvar. */}
      <AlertDialog open={pendingSlugChange !== null} onOpenChange={(open) => !open && setPendingSlugChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar o slug de uma peça publicada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta peça está publicada na loja do site com o slug{" "}
              <strong>{product?.slug}</strong>. Ao trocar para{" "}
              <strong>{pendingSlugChange?.slug}</strong>, os links que já apontam para o endereço antigo deixam de
              funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter o slug atual</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const values = pendingSlugChange;
                setPendingSlugChange(null);
                if (values) void save(values);
              }}
            >
              Trocar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
