import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../../errors.ts";
import { env } from "../../config.ts";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Dados inválidos.",
      details: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }
  console.error("[erro não tratado]", err);
  res.status(500).json({
    error: "Erro interno do servidor.",
    ...(env.NODE_ENV === "development" ? { detail: String(err) } : {}),
  });
};
