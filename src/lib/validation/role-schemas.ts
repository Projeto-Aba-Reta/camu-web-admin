import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug é obrigatório.")
    .regex(SLUG_PATTERN, "Use apenas letras minúsculas, números e hífens."),
  description: z.string().trim().optional(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
