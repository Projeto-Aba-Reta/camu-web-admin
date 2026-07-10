import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.string().trim().min(1, "E-mail é obrigatório.").email("Informe um e-mail válido."),
  fullName: z.string().trim().optional(),
});

export type InviteUserValues = z.infer<typeof inviteUserSchema>;
