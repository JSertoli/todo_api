import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import type { HashProvider, TokenProvider } from "../domain/ports.ts";
import { AppError } from "../errors.ts";

const SALT_ROUNDS = 12;

export class BcryptHashProvider implements HashProvider {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }
  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}

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
