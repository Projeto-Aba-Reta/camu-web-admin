import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  "miniatura_colecionavel",
  "personalizado",
  "utilitario",
  "linha_leon",
] as const;

export const PRODUCT_STATUSES = ["rascunho", "ativo", "inativo", "descontinuado"] as const;

export const PRODUCT_TYPES = ["simples", "composta"] as const;

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório."),
  description: z.string().trim().optional(),
  category: z.enum(PRODUCT_CATEGORIES, { message: "Selecione uma categoria." }),
  status: z.enum(PRODUCT_STATUSES, { message: "Selecione um status." }),
  productType: z.enum(PRODUCT_TYPES, { message: "Selecione o tipo de peça." }),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const channelListingFormSchema = z.object({
  listedPrice: z.coerce.number({ message: "Informe o preço praticado." }).positive("Informe um preço positivo."),
  priceOverrideReason: z.string().trim().optional(),
});

export type ChannelListingFormValues = z.infer<typeof channelListingFormSchema>;
