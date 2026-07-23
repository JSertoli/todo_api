import type { RequestHandler } from "express";
import type { TokenProvider } from "../../domain/ports/providers.ts";
import { AppError } from "../../errors.ts";

/** Exige `Authorization: Bearer <token>` válido e injeta req.userId. */
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
