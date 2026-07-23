import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .max(72, "A senha deve ter no máximo 72 caracteres."),
});

export const loginSchema = z.object({
  email: z.email("E-mail inválido."),
  password: z.string().min(1, "Senha é obrigatória."),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken é obrigatório."),
});
