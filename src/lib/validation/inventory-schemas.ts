import { z } from "zod";

export const MATERIAL_TYPES = ["filamento", "embalagem"] as const;

// Filamento é cadastrado sempre em kg ou g: garante custo por kg resolvível e
// baixa de estoque consistente (o saldo de filamento é canônico em gramas) —
// ver Requirement "Cadastro de insumo com custo de referência".
export const FILAMENT_UNITS = ["kg", "g"] as const;

export const MATERIAL_MOVEMENT_TYPES = ["compra", "consumo_producao", "perda_refugo", "ajuste_manual"] as const;

export const PRODUCT_MOVEMENT_TYPES = ["producao", "venda", "perda", "ajuste_manual"] as const;

export const materialFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nome é obrigatório."),
    type: z.enum(MATERIAL_TYPES, { message: "Selecione um tipo." }),
    unit: z.string().trim().min(1, "Unidade é obrigatória."),
    referenceCost: z.coerce
      .number({ message: "Informe o custo de referência." })
      .nonnegative("Informe um valor válido."),
  })
  .superRefine((data, ctx) => {
    if (data.type === "filamento" && !FILAMENT_UNITS.includes(data.unit as (typeof FILAMENT_UNITS)[number])) {
      ctx.addIssue({ code: "custom", path: ["unit"], message: "Filamento deve ser cadastrado em kg ou g." });
    }
  });

export type MaterialFormValues = z.infer<typeof materialFormSchema>;

// Sinal da quantidade: a UI normaliza compra/perda_refugo/consumo_producao
// para o sinal correto antes de enviar à action (ver design.md e migration
// estoque_insumos_e_pecas_prontas: quantity positiva = entrada, negativa =
// saída). ajuste_manual é o único tipo em que o usuário informa o sinal
// diretamente, por isso não valida positividade aqui.
export const materialMovementFormSchema = z
  .object({
    movementType: z.enum(MATERIAL_MOVEMENT_TYPES, { message: "Selecione o tipo de movimentação." }),
    quantity: z.coerce.number({ message: "Informe a quantidade." }),
    printerId: z.string().optional(),
    productId: z.string().optional(),
    producedQuantity: z.coerce.number().optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.quantity === 0) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Quantidade não pode ser zero." });
    }
    if (data.movementType !== "ajuste_manual" && data.quantity < 0) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Informe um valor positivo." });
    }
    if (data.movementType === "ajuste_manual" && !data.notes) {
      ctx.addIssue({ code: "custom", path: ["notes"], message: "Nota obrigatória para ajuste manual." });
    }
    if (data.movementType === "consumo_producao" && data.productId) {
      if (!data.producedQuantity || data.producedQuantity <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["producedQuantity"],
          message: "Informe a quantidade de peças produzidas.",
        });
      }
    }
  });

export type MaterialMovementFormValues = z.infer<typeof materialMovementFormSchema>;

export const materialThresholdFormSchema = z.object({
  minimumQuantity: z.coerce.number({ message: "Informe o limite mínimo." }).nonnegative("Informe um valor válido."),
});

export type MaterialThresholdFormValues = z.infer<typeof materialThresholdFormSchema>;

export const productMovementFormSchema = z
  .object({
    movementType: z.enum(PRODUCT_MOVEMENT_TYPES, { message: "Selecione o tipo de movimentação." }),
    quantity: z.coerce.number({ message: "Informe a quantidade." }),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.quantity === 0) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Quantidade não pode ser zero." });
    }
    if (data.movementType !== "ajuste_manual" && data.quantity < 0) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: "Informe um valor positivo." });
    }
    if (data.movementType === "ajuste_manual" && !data.notes) {
      ctx.addIssue({ code: "custom", path: ["notes"], message: "Nota obrigatória para ajuste manual." });
    }
  });

export type ProductMovementFormValues = z.infer<typeof productMovementFormSchema>;
