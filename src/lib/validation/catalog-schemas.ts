import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/catalog/slug";

export const PRODUCT_CATEGORIES = [
  "miniatura_colecionavel",
  "personalizado",
  "utilitario",
  "linha_leon",
] as const;

export const PRODUCT_STATUSES = ["rascunho", "ativo", "inativo", "descontinuado"] as const;

export const PRODUCT_TYPES = ["simples", "composta"] as const;

// Dias de prazo de produção: campo de texto onde vazio significa "não
// informado" (nulo), não zero. Fica como string no schema — a conversão é do
// chamador, via leadDaysValue, para que entrada e saída do formulário tenham
// o mesmo tipo (react-hook-form exige isso do control).
const optionalLeadDays = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), {
    message: "Informe o prazo como um número inteiro de dias.",
  });

export function leadDaysValue(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório."),
    // Vazio = o service gera o slug a partir do nome no cadastro.
    slug: z
      .string()
      .trim()
      .refine((value) => value === "" || SLUG_PATTERN.test(value), {
        message: "Use apenas letras minúsculas, números e hífen (ex.: guerreiro-anao).",
      }),
    description: z.string().trim().optional(),
    category: z.enum(PRODUCT_CATEGORIES, { message: "Selecione uma categoria." }),
    status: z.enum(PRODUCT_STATUSES, { message: "Selecione um status." }),
    productType: z.enum(PRODUCT_TYPES, { message: "Selecione o tipo de peça." }),
    productionLeadDaysMin: optionalLeadDays,
    productionLeadDaysMax: optionalLeadDays,
  })
  .refine(
    (values) => {
      const min = leadDaysValue(values.productionLeadDaysMin);
      const max = leadDaysValue(values.productionLeadDaysMax);
      return min === null || max === null || max >= min;
    },
    { message: "O prazo máximo não pode ser menor que o mínimo.", path: ["productionLeadDaysMax"] },
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const channelListingFormSchema = z.object({
  listedPrice: z.coerce.number({ message: "Informe o preço praticado." }).positive("Informe um preço positivo."),
  priceOverrideReason: z.string().trim().optional(),
});

export type ChannelListingFormValues = z.infer<typeof channelListingFormSchema>;
