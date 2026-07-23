import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import type { TokenProvider } from "../../domain/ports/providers.ts";
import { AppError } from "../../errors.ts";

export class JwtTokenProvider implements TokenProvider {
  constructor(
    private readonly accessSecret: string,
    private readonly accessTtlSeconds: number,
  ) { }

  generateAccessToken(userId: string): string {
    return jwt.sign({ sub: userId }, this.accessSecret, {
      expiresIn: this.accessTtlSeconds, // segundos
    });
  }

  verifyAccessToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.accessSecret);
      if (typeof decoded === "string" || typeof decoded.sub !== "string") {
        throw new AppError(401, "Token inválido.");
      }
      return { userId: decoded.sub };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(401, "Token inválido ou expirado.");
    }
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString("hex");
  }
  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
