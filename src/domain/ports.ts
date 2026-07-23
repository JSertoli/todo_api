import type { User, RefreshToken } from "./entities.ts";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: { email: string; password: string }): Promise<User>;
}

export interface RefreshTokenRepository {
  create(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken>;
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<void>;
}

export interface HashProvider {
  hash(plain: string): Promise<string>;
  compare(plain: string, hashed: string): Promise<boolean>;
}

export interface TokenProvider {
  generateAccessToken(userId: string): string;
  verifyAccessToken(token: string): { userId: string };
  generateRefreshToken(): string;
  hashRefreshToken(token: string): string;
}
