import { z } from "zod";

export const addToQueueFormSchema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  quantity: z.coerce
    .number({ message: "Informe a quantidade." })
    .int("Informe um número inteiro.")
    .positive("Quantidade deve ser maior que zero."),
});

export type AddToQueueFormValues = z.infer<typeof addToQueueFormSchema>;

export const startPrintingFormSchema = z.object({
  printerId: z.string().min(1, "Selecione uma impressora."),
});

export type StartPrintingFormValues = z.infer<typeof startPrintingFormSchema>;
