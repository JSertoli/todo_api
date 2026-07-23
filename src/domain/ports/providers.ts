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
