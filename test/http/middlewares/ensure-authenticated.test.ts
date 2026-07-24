import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { ensureAuthenticated } from "../../../src/http/middlewares/ensure-authenticated.ts";
import { AppError } from "../../../src/errors.ts";
import type { TokenProvider } from "../../../src/domain/ports/providers.ts";

function createTokenProvider(overrides: Partial<TokenProvider> = {}): TokenProvider {
  return {
    generateAccessToken: vi.fn(),
    verifyAccessToken: vi.fn(() => ({ userId: "user-1" })),
    generateRefreshToken: vi.fn(),
    hashRefreshToken: vi.fn(),
    ...overrides,
  };
}

function createReq(authorization?: string): Request {
  return { headers: { authorization }, userId: undefined } as unknown as Request;
}

describe("ensureAuthenticated", () => {
  it("injeta req.userId e chama next() quando o token é válido", () => {
    const tokens = createTokenProvider();
    const middleware = ensureAuthenticated(tokens);
    const req = createReq("Bearer token-valido");
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(req.userId).toBe("user-1");
    expect(tokens.verifyAccessToken).toHaveBeenCalledWith("token-valido");
    expect(next).toHaveBeenCalledWith();
  });

  it("chama next com AppError 401 quando não há header Authorization", () => {
    const tokens = createTokenProvider();
    const middleware = ensureAuthenticated(tokens);
    const req = createReq(undefined);
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
  });

  it("chama next com AppError 401 quando o esquema não é Bearer", () => {
    const tokens = createTokenProvider();
    const middleware = ensureAuthenticated(tokens);
    const req = createReq("Basic dXNlcjpwYXNz");
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("propaga o erro lançado pelo TokenProvider (token inválido/expirado)", () => {
    const tokenError = new AppError(401, "Token inválido ou expirado.");
    const tokens = createTokenProvider({
      verifyAccessToken: vi.fn(() => {
        throw tokenError;
      }),
    });
    const middleware = ensureAuthenticated(tokens);
    const req = createReq("Bearer token-invalido");
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(tokenError);
    expect(req.userId).toBeUndefined();
  });

  it("remove o prefixo 'Bearer ' e espaços extras antes de verificar o token", () => {
    const tokens = createTokenProvider();
    const middleware = ensureAuthenticated(tokens);
    const req = createReq("Bearer  token-com-espacos  ");
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(tokens.verifyAccessToken).toHaveBeenCalledWith("token-com-espacos");
  });
});
