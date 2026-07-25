import { z } from "zod";
import { ORDER_COST_CATEGORIES, STAGE_COLORS } from "@/types/vendas";

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

// Sentinela do Select de peça: o item não sai do catálogo, o nome é digitado.
// O Radix Select não aceita item com value vazio, daí a sentinela.
export const OFF_CATALOG_OPTION = "__fora_do_catalogo__";

export const salesOrderItemSchema = z
  .object({
    // A sentinela é um valor válido aqui — quem exige o nome no lugar da peça
    // é o superRefine abaixo.
    productId: z.string().min(1, "Escolha a peça."),
    // Só é lido quando productId é a sentinela.
    productName: z.string(),
    quantity: z.coerce
      .number()
      .int("A quantidade precisa ser um número inteiro.")
      .positive("A quantidade precisa ser maior que zero."),
    unitPrice: currencyField("Informe o preço praticado."),
    // Centavos vindos da precificação simples; vazio = item não precificado.
    unitCostCents: z.number().int().nonnegative().nullable(),
    variant: z.string(),
  })
  .superRefine((item, ctx) => {
    if (item.productId === OFF_CATALOG_OPTION && item.productName.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["productName"],
        message: "Informe o nome do item fora do catálogo.",
      });
    }
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
  // Texto livre: quem vendeu pode não ter conta no ERP. A obrigatoriedade
  // depende de requires_seller da origem escolhida, que o formulário só conhece
  // em tempo de execução — o refinamento é aplicado no componente sobre a lista
  // de origens.
  soldByName: z.string(),
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
