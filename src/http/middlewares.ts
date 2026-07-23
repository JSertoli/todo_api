import type { RequestHandler, ErrorRequestHandler } from "express";
import { ZodError, type ZodType } from "zod";
import type { TokenProvider } from "../domain/ports.ts";
import { AppError } from "../errors.ts";
import { env } from "../config.ts";

export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

export function ensureAuthenticated(tokens: TokenProvider): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new AppError(401, "Token de acesso não fornecido."));
    }
    try {
      const { userId } = tokens.verifyAccessToken(header.slice(7).trim());
      req.userId = userId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

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
