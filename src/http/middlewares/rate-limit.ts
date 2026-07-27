import { rateLimit } from "express-rate-limit";
import { AppError } from "../../errors.ts";

function tooManyRequests(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, message)),
  });
}

export function createAuthRateLimiter() {
  return tooManyRequests(
    2 * 60 * 1000,
    10,
    "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  );
}

export const globalRateLimiter = tooManyRequests(
  60 * 1000,
  100,
  "Muitas requisições. Tente novamente em instantes.",
);
