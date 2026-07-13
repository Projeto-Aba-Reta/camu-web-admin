import { z } from "zod";

const positiveNumber = (message: string) => z.coerce.number({ message }).positive(message);
const nonNegativeNumber = (message: string) =>
  z.coerce.number({ message }).min(0, message);

// Formulário usa "%" (ex.: 12,5) para reserva de falha e taxa percentual de
// canal — o schema/motor de cálculo guarda a fração (0-1). A conversão
// acontece no componente, antes de chamar a Server Action.
export const costParametersFormSchema = z.object({
  filamentCostPerKg: positiveNumber("Informe o custo do filamento por kg."),
  energyCostPerKwh: positiveNumber("Informe o custo de energia por kWh."),
  averagePowerWatts: positiveNumber("Informe o consumo médio em watts."),
  failureReservePctPercent: nonNegativeNumber("Informe a reserva de falha (%)."),
  packagingCost: nonNegativeNumber("Informe o custo de embalagem."),
  targetMarginPctPercent: nonNegativeNumber("Informe a margem-alvo B2C (%)."),
});

export type CostParametersFormValues = z.infer<typeof costParametersFormSchema>;

export const printerFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório."),
  model: z.string().trim().min(1, "Modelo é obrigatório."),
  depreciationPerHour: nonNegativeNumber("Informe a depreciação por hora."),
});

export type PrinterFormValues = z.infer<typeof printerFormSchema>;

export const MARKETPLACE_CHANNELS = [
  "mercado_livre",
  "shopee",
  "tiktok_shop",
  "amazon",
  "shein",
] as const;

export const channelFeeFormSchema = z.object({
  channel: z.enum(MARKETPLACE_CHANNELS, { message: "Selecione um canal." }),
  percentageFeePercent: nonNegativeNumber("Informe a taxa percentual (%)."),
  fixedFee: nonNegativeNumber("Informe a taxa fixa."),
});

export type ChannelFeeFormValues = z.infer<typeof channelFeeFormSchema>;

export const SIZE_TIERS = ["P", "M", "G"] as const;

export const sizeTierRangeFormSchema = z
  .object({
    tier: z.enum(SIZE_TIERS, { message: "Selecione um porte." }),
    minWeightGrams: nonNegativeNumber("Informe o peso mínimo."),
    maxWeightGrams: positiveNumber("Informe o peso máximo."),
    minPrintHours: nonNegativeNumber("Informe o tempo mínimo."),
    maxPrintHours: positiveNumber("Informe o tempo máximo."),
  })
  .refine((values) => values.maxWeightGrams > values.minWeightGrams, {
    message: "Peso máximo deve ser maior que o peso mínimo.",
    path: ["maxWeightGrams"],
  })
  .refine((values) => values.maxPrintHours > values.minPrintHours, {
    message: "Tempo máximo deve ser maior que o tempo mínimo.",
    path: ["maxPrintHours"],
  });

export type SizeTierRangeFormValues = z.infer<typeof sizeTierRangeFormSchema>;

// weightGrams/printHours ficam opcionais quando productId é informado — o
// motor deriva os dois valores da ficha de fatiamento cadastrada para a
// peça + impressora (ver Requirement "Cálculo a partir de uma ficha de
// fatiamento cadastrada"). O refine abaixo garante que ao menos uma das
// duas formas de entrada foi preenchida.
export const calculoFormSchema = z
  .object({
    weightGrams: z.coerce.number().positive("Informe o peso em gramas.").optional(),
    printHours: z.coerce.number().positive("Informe o tempo de impressão em horas.").optional(),
    printerId: z.string().min(1, "Selecione uma impressora."),
    productId: z.string().optional(),
  })
  .refine((values) => Boolean(values.productId) || (values.weightGrams && values.printHours), {
    message: "Informe peso e tempo, ou selecione uma peça com ficha de fatiamento cadastrada.",
    path: ["weightGrams"],
  });

export type CalculoFormValues = z.infer<typeof calculoFormSchema>;

export const b2bPricingTierFormSchema = z.object({
  minQuantity: positiveNumber("Informe a quantidade mínima da faixa."),
  targetMarginPctPercent: nonNegativeNumber("Informe a margem-alvo B2B (%)."),
});

export type B2bPricingTierFormValues = z.infer<typeof b2bPricingTierFormSchema>;
