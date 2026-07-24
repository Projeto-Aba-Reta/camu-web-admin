"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { formatCents } from "@/components/vendas/labels";
import {
  NONE_OPTION,
  formatCentsToInput,
  parseCurrencyToCents,
  salesOrderFormSchema,
  type SalesOrderFormValues,
} from "@/lib/validation/vendas-schemas";
import {
  createSalesOrderAction,
  updateSalesOrderAction,
  type SalesOrderActionInput,
} from "@/app/(dashboard)/vendas/actions";
import type { OrderPipelineStage, SaleOrigin, SalesOrder } from "@/types/vendas";
import type { Product } from "@/types/catalog";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface SalesOrderFormProps {
  origins: SaleOrigin[];
  stages: OrderPipelineStage[];
  products: Product[];
  profiles: Profile[];
  // Ausente = cadastro. Presente = edição.
  order?: SalesOrder;
}

// O tipo de ENTRADA do schema, não o de saída: `quantity` sai como number do
// zod mas entra como o que o input de texto entrega (mesmo padrão de
// material-movement-form).
type SalesOrderFormInput = z.input<typeof salesOrderFormSchema>;

function toFormValues(order: SalesOrder | undefined, stages: OrderPipelineStage[]): SalesOrderFormInput {
  const initialStage = stages.find((stage) => stage.isInitial);

  return {
    customerName: order?.customerName ?? "",
    customerEmail: order?.customerEmail ?? "",
    customerPhone: order?.customerPhone ?? "",
    addressCep: order?.addressCep ?? "",
    addressLine: order?.addressLine ?? "",
    addressCity: order?.addressCity ?? "",
    addressUf: order?.addressUf ?? "",
    saleOriginId: order?.saleOriginId ?? "",
    soldByProfileId: order?.soldByProfileId ?? NONE_OPTION,
    stageId: order?.stageId ?? initialStage?.id ?? "",
    shipping: formatCentsToInput(order?.shippingCents ?? 0),
    items:
      order?.items.map((item) => ({
        productId: item.productId ?? "",
        quantity: item.qty,
        unitPrice: formatCentsToInput(item.unitPriceCents),
        variant: item.variant ?? "",
      })) ?? [],
  };
}

function emptyOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toActionInput(values: SalesOrderFormValues): SalesOrderActionInput {
  return {
    customerName: values.customerName.trim(),
    customerEmail: emptyOrNull(values.customerEmail),
    customerPhone: emptyOrNull(values.customerPhone),
    addressCep: emptyOrNull(values.addressCep),
    addressLine: emptyOrNull(values.addressLine),
    addressCity: emptyOrNull(values.addressCity),
    addressUf: emptyOrNull(values.addressUf),
    saleOriginId: values.saleOriginId,
    soldByProfileId: values.soldByProfileId === NONE_OPTION ? null : values.soldByProfileId,
    stageId: values.stageId === "" ? null : values.stageId,
    shippingCents: parseCurrencyToCents(values.shipping) ?? 0,
    items: values.items.map((item) => ({
      productId: item.productId,
      unitPriceCents: parseCurrencyToCents(item.unitPrice) ?? 0,
      qty: item.quantity,
      variant: emptyOrNull(item.variant),
    })),
  };
}

export function SalesOrderForm({ origins, stages, products, profiles, order }: SalesOrderFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = order !== undefined;

  const form = useForm<SalesOrderFormInput, unknown, SalesOrderFormValues>({
    resolver: zodResolver(salesOrderFormSchema),
    defaultValues: toFormValues(order, stages),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const selectedOriginId = form.watch("saleOriginId");
  const selectedOrigin = origins.find((origin) => origin.id === selectedOriginId);
  const items = form.watch("items");

  // Prévia do total com a mesma conta do servidor — o número que o usuário vê
  // antes de salvar tem que ser o que será gravado.
  const subtotalCents = items.reduce(
    (sum, item) => sum + (parseCurrencyToCents(item.unitPrice) ?? 0) * (Number(item.quantity) || 0),
    0,
  );
  const totalCents = subtotalCents + (parseCurrencyToCents(form.watch("shipping")) ?? 0);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) form.reset(toFormValues(order, stages));
    setOpen(nextOpen);
  }

  async function onSubmit(values: SalesOrderFormValues) {
    // A exigência de vendedor vem da origem escolhida, que o schema estático
    // não conhece — o servidor recusa de qualquer forma, isto é só o aviso
    // antes do round-trip.
    if (selectedOrigin?.requiresSeller && values.soldByProfileId === NONE_OPTION) {
      form.setError("soldByProfileId", {
        message: `A origem "${selectedOrigin.name}" exige informar quem vendeu.`,
      });
      return;
    }

    const input = toActionInput(values);
    const result = isEditing
      ? await updateSalesOrderAction(order.id, input)
      : await createSalesOrderAction(input);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o pedido.");
      return;
    }

    toast.success(isEditing ? "Pedido atualizado." : "Pedido cadastrado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="ghost" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="size-4" />
            Novo pedido
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar pedido" : "Novo pedido"}</DialogTitle>
          <DialogDescription>
            Venda fechada fora da loja do site — boca-a-boca, feira, marketplace. O preço de cada
            item é o praticado, que pode divergir do preço de tabela da peça.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprador</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome de quem comprou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="saleOriginId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Como conseguimos a venda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {origins.map((origin) => (
                          <SelectItem key={origin.id} value={origin.id}>
                            {origin.name}
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
                name="soldByProfileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quem vendeu{selectedOrigin?.requiresSeller ? "" : " (opcional)"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o vendedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_OPTION}>Ninguém em específico</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.fullName ?? profile.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEditing && (
              <FormField
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapa inicial no funil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a etapa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Venda de peça que já estava pronta pode entrar direto em &quot;Aguardando
                      envio&quot;.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Itens</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: "", quantity: 1, unitPrice: "0,00", variant: "" })}
                >
                  <Plus className="size-4" />
                  Adicionar item
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">Nenhum item ainda.</p>
              )}

              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Peça do catálogo" />
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
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Qtd"
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
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input inputMode="decimal" placeholder="Preço" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}

              {form.formState.errors.items?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="shipping"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frete</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col justify-end text-sm">
                <span className="text-muted-foreground">
                  Subtotal: {formatCents(subtotalCents)}
                </span>
                <span className="font-medium text-foreground">
                  Total: {formatCents(totalCents)}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? "Salvar" : "Cadastrar pedido"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
