import { z } from "zod";
import { ORDER_COST_CATEGORIES, STAGE_COLORS } from "@/types/vendas";

// "Nenhum" no Select — o Radix Select não aceita item com value vazio, então
// a ausência de vendedor responsável viaja como sentinela e vira null no
// submit. Mesmo padrão de marketing-schemas.
export const NONE_OPTION = "__none__";

// Valores monetários chegam do formulário como texto em reais ("42,90") e
// viram centavos inteiros. Fazer a conversão aqui, e não no componente,
// mantém o arredondamento em um lugar só.
export function parseCurrencyToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export function formatCentsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const currencyField = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => parseCurrencyToCents(value) !== null, { message });

export const salesOrderItemSchema = z.object({
  productId: z.string().min(1, "Escolha a peça."),
  quantity: z.coerce
    .number()
    .int("A quantidade precisa ser um número inteiro.")
    .positive("A quantidade precisa ser maior que zero."),
  unitPrice: currencyField("Informe o preço praticado."),
  variant: z.string(),
});

export const salesOrderFormSchema = z.object({
  customerName: z.string().trim().min(1, "Informe o nome do comprador."),
  customerEmail: z.string(),
  customerPhone: z.string(),
  addressCep: z.string(),
  addressLine: z.string(),
  addressCity: z.string(),
  addressUf: z.string(),
  saleOriginId: z.string().min(1, "Selecione a origem da venda."),
  // A obrigatoriedade depende de requires_seller da origem escolhida, que o
  // formulário só conhece em tempo de execução — o refinamento é aplicado no
  // componente com superRefine sobre a lista de origens.
  soldByProfileId: z.string(),
  stageId: z.string(),
  shipping: currencyField("Informe o frete (use 0 se não houver)."),
  items: z.array(salesOrderItemSchema).min(1, "O pedido precisa de pelo menos um item."),
});

export type SalesOrderFormValues = z.infer<typeof salesOrderFormSchema>;

export const orderCostFormSchema = z.object({
  amount: currencyField("Informe o valor do custo.").refine(
    (value) => (parseCurrencyToCents(value) ?? 0) > 0,
    { message: "O valor do custo precisa ser maior que zero." },
  ),
  category: z.enum(ORDER_COST_CATEGORIES, { message: "Selecione a categoria." }),
  description: z.string(),
});

export type OrderCostFormValues = z.infer<typeof orderCostFormSchema>;

export const stageFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da etapa."),
  color: z.enum(STAGE_COLORS, { message: "Selecione a cor." }),
  requiresPrinter: z.boolean(),
});

export type StageFormValues = z.infer<typeof stageFormSchema>;

export const saleOriginFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da origem."),
  requiresSeller: z.boolean(),
});

export type SaleOriginFormValues = z.infer<typeof saleOriginFormSchema>;

export const moveOrderFormSchema = z.object({
  toStageId: z.string().min(1, "Selecione a etapa de destino."),
  // Obrigatório só quando a etapa destino exige impressora — refinado no
  // componente, que é quem conhece a etapa escolhida.
  printerId: z.string(),
  note: z.string(),
});

export type MoveOrderFormValues = z.infer<typeof moveOrderFormSchema>;
