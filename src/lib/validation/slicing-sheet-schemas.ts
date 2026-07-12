import { z } from "zod";

export const slicingSheetMaterialFormSchema = z
  .object({
    materialId: z.string().min(1, "Selecione um material."),
    pieceGrams: z.coerce.number({ message: "Informe as gramas na peça." }).nonnegative("Informe um valor válido."),
    supportGrams: z.coerce
      .number({ message: "Informe as gramas em suporte." })
      .nonnegative("Informe um valor válido."),
  })
  .superRefine((data, ctx) => {
    if (data.pieceGrams <= 0 && data.supportGrams <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["pieceGrams"],
        message: "Informe gramas na peça ou em suporte maior que zero.",
      });
    }
  });

export const slicingSheetFormSchema = z.object({
  printerId: z.string().min(1, "Selecione uma impressora."),
  printHours: z.coerce
    .number({ message: "Informe o tempo de impressão." })
    .positive("Informe um tempo maior que zero."),
  materials: z.array(slicingSheetMaterialFormSchema).min(1, "Adicione pelo menos um material."),
});

export type SlicingSheetFormValues = z.infer<typeof slicingSheetFormSchema>;
