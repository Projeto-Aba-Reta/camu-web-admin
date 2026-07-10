import { z } from "zod";

export const profitSplitFormSchema = z.object({
  profitSplitRule: z.string().trim().min(1, "Regra de divisão de lucro é obrigatória."),
  exitTerms: z.string().trim().optional(),
});

export type ProfitSplitFormValues = z.infer<typeof profitSplitFormSchema>;

export const capitalContributionFormSchema = z.object({
  partnerProfileId: z.string().trim().min(1, "Selecione um sócio."),
  amount: z.number().positive("Informe um valor maior que zero."),
  contributionDate: z.string().trim().min(1, "Informe a data do aporte."),
  proofReference: z.string().trim().optional(),
});

export type CapitalContributionFormValues = z.infer<typeof capitalContributionFormSchema>;

export const legalStatusFormSchema = z
  .object({
    entityType: z.enum(["mei", "me"]),
    cnpj: z.string().trim().optional(),
    titularProfileId: z.string().trim().optional(),
  })
  .refine((data) => data.entityType !== "mei" || !!data.titularProfileId, {
    message: "Titular é obrigatório para enquadramento MEI.",
    path: ["titularProfileId"],
  });

export type LegalStatusFormValues = z.infer<typeof legalStatusFormSchema>;

export const migrationTriggerRevertFormSchema = z.object({
  notes: z.string().trim().min(1, "Informe uma nota explicando a reversão."),
});

export type MigrationTriggerRevertFormValues = z.infer<typeof migrationTriggerRevertFormSchema>;

export const revenueSnapshotFormSchema = z.object({
  referenceMonth: z.string().trim().min(1, "Informe o mês de referência."),
  monthlyRevenue: z.number().nonnegative("Informe um valor válido."),
  notes: z.string().trim().optional(),
});

export type RevenueSnapshotFormValues = z.infer<typeof revenueSnapshotFormSchema>;

export const decisionLogFormSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório."),
  context: z.string().trim().min(1, "Contexto é obrigatório."),
  decision: z.string().trim().min(1, "Decisão é obrigatória."),
  alternativesConsidered: z.string().trim().optional(),
  reasoning: z.string().trim().optional(),
  decidedAt: z.string().trim().min(1, "Informe a data da decisão."),
});

export type DecisionLogFormValues = z.infer<typeof decisionLogFormSchema>;
