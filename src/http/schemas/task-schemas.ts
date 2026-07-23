import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório.").max(200, "Título muito longo."),
  description: z.string().max(2000, "Descrição muito longa.").optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Título não pode ser vazio.").max(200).optional(),
  description: z.string().max(2000).optional(),
  completed: z.boolean().optional(),
});
