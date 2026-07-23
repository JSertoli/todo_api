import type { RequestHandler } from "express";
import type { ZodType } from "zod";

/** Valida req.body contra um schema Zod e troca o body pelo já parseado. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
