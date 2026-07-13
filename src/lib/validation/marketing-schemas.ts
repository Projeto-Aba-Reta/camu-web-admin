import { z } from "zod";

// "Nenhuma" no Select — o Radix Select não aceita item com value vazio, então
// a ausência de vínculo/responsável viaja como sentinela e vira null no submit.
export const NONE_OPTION = "__none__";

const FIXA_RULE_VALUE = /^\d{2}-\d{2}$/;
const MOVEL_RULE_VALUE = /^\d{4}-\d{2}-\d{2}$/;

export const commemorativeDateFormSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome da data comemorativa."),
    ruleType: z.enum(["fixa", "movel"], { message: "Selecione o tipo de regra." }),
    // Espelha o check constraint da tabela: fixa repete todo ano ('MM-DD');
    // movel guarda a ocorrência concreta do ciclo atual ('YYYY-MM-DD').
    ruleValue: z.string().trim().min(1, "Informe a data."),
    category: z.string().trim().min(1, "Informe a categoria."),
  })
  .refine((values) => values.ruleType !== "fixa" || FIXA_RULE_VALUE.test(values.ruleValue), {
    path: ["ruleValue"],
    message: "Data fixa deve estar no formato MM-DD (ex. 12-25).",
  })
  .refine((values) => values.ruleType !== "movel" || MOVEL_RULE_VALUE.test(values.ruleValue), {
    path: ["ruleValue"],
    message: "Data móvel deve estar no formato AAAA-MM-DD (ex. 2026-11-27).",
  });

export type CommemorativeDateFormValues = z.infer<typeof commemorativeDateFormSchema>;

export const planItemFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do post."),
  // Um post cobre uma ou mais redes (a mesma gravação vai para Instagram,
  // TikTok e Kwai) — ver tabela social_content_plan_item_channels.
  channels: z
    .array(z.enum(["instagram", "tiktok", "youtube", "kwai", "facebook", "outro"]))
    .min(1, "Selecione pelo menos um canal."),
  commemorativeDateId: z.string(),
  responsibleId: z.string(),
  targetDate: z.string(),
  notes: z.string(),
});

export type PlanItemFormValues = z.infer<typeof planItemFormSchema>;
