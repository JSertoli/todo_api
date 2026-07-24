import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { JwtTokenProvider } from "../../../src/infra/providers/jwt-token-provider.ts";

const SECRET = "test-secret-com-pelo-menos-32-caracteres!!";

describe("JwtTokenProvider", () => {
  describe("access token", () => {
    it("gera um token que carrega o userId e pode ser verificado de volta", () => {
      const provider = new JwtTokenProvider(SECRET, 900);

      const token = provider.generateAccessToken("user-123");
      const { userId } = provider.verifyAccessToken(token);

      expect(userId).toBe("user-123");
    });

    it("aplica o TTL configurado (em segundos) na expiração do token", () => {
      const provider = new JwtTokenProvider(SECRET, 900);

      const token = provider.generateAccessToken("user-123");
      const decoded = jwt.decode(token) as { iat: number; exp: number };

      expect(decoded.exp - decoded.iat).toBe(900);
    });

    it("rejeita token assinado com um segredo diferente", () => {
      const provider = new JwtTokenProvider(SECRET, 900);
      const foreignToken = jwt.sign({ sub: "user-123" }, "outro-segredo-completamente-diferente");

      expect(() => provider.verifyAccessToken(foreignToken)).toThrowError(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it("rejeita token expirado", () => {
      const provider = new JwtTokenProvider(SECRET, 900);
      const expiredToken = jwt.sign({ sub: "user-123" }, SECRET, { expiresIn: -10 });

      expect(() => provider.verifyAccessToken(expiredToken)).toThrowError(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it("rejeita token malformado (não é um JWT)", () => {
      const provider = new JwtTokenProvider(SECRET, 900);

      expect(() => provider.verifyAccessToken("isso-nao-e-um-jwt")).toThrowError(
        expect.objectContaining({ statusCode: 401 }),
      );
    });

    it("rejeita token cujo payload não é um objeto com 'sub'", () => {
      const provider = new JwtTokenProvider(SECRET, 900);
      // jwt.verify de um payload string devolve uma string, não um objeto —
      // exercita o branch `typeof decoded === "string"` do provider.
      const stringPayloadToken = jwt.sign("payload-em-string", SECRET);

      expect(() => provider.verifyAccessToken(stringPayloadToken)).toThrowError(
        expect.objectContaining({ statusCode: 401 }),
      );
    });
  });

  describe("refresh token", () => {
    it("gera refresh tokens aleatórios e distintos a cada chamada", () => {
      const provider = new JwtTokenProvider(SECRET, 900);

      const a = provider.generateRefreshToken();
      const b = provider.generateRefreshToken();

      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9a-f]{96}$/); // 48 bytes em hex
    });

    it("hashRefreshToken é determinístico (mesma entrada => mesmo hash)", () => {
      const provider = new JwtTokenProvider(SECRET, 900);
      const token = provider.generateRefreshToken();

      expect(provider.hashRefreshToken(token)).toBe(provider.hashRefreshToken(token));
    });

    it("hashRefreshToken nunca devolve o valor original", () => {
      const provider = new JwtTokenProvider(SECRET, 900);
      const token = provider.generateRefreshToken();

      expect(provider.hashRefreshToken(token)).not.toBe(token);
    });

    it("tokens diferentes produzem hashes diferentes", () => {
      const provider = new JwtTokenProvider(SECRET, 900);
      const a = provider.generateRefreshToken();
      const b = provider.generateRefreshToken();

      expect(provider.hashRefreshToken(a)).not.toBe(provider.hashRefreshToken(b));
    });
  });
});
