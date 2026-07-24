import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { AuthController } from "../../../src/http/controllers/auth-controller.ts";
import type { AuthService } from "../../../src/application/auth-service.ts";

function createRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

function createAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    ...overrides,
  } as unknown as AuthService;
}

describe("AuthController", () => {
  it("register: delega ao AuthService e responde 201 com o usuário criado", async () => {
    const user = { id: "1", email: "joao@example.com", createdAt: new Date() };
    const auth = createAuthService({ register: vi.fn().mockResolvedValue(user) });
    const controller = new AuthController(auth);
    const req = {
      body: { email: "joao@example.com", password: "senhaSegura123" },
    } as Request;
    const res = createRes();

    await controller.register(req, res);

    expect(auth.register).toHaveBeenCalledWith("joao@example.com", "senhaSegura123");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user });
  });

  it("login: delega ao AuthService e responde com a sessão (user + tokens)", async () => {
    const session = {
      user: { id: "1", email: "a@b.com", createdAt: new Date() },
      accessToken: "access",
      refreshToken: "refresh",
    };
    const auth = createAuthService({ login: vi.fn().mockResolvedValue(session) });
    const controller = new AuthController(auth);
    const req = { body: { email: "a@b.com", password: "x" } } as Request;
    const res = createRes();

    await controller.login(req, res);

    expect(auth.login).toHaveBeenCalledWith("a@b.com", "x");
    expect(res.json).toHaveBeenCalledWith(session);
  });

  it("refresh: delega ao AuthService e responde com o novo par de tokens", async () => {
    const newTokens = { accessToken: "novo-access", refreshToken: "novo-refresh" };
    const auth = createAuthService({ refresh: vi.fn().mockResolvedValue(newTokens) });
    const controller = new AuthController(auth);
    const req = { body: { refreshToken: "refresh-antigo" } } as Request;
    const res = createRes();

    await controller.refresh(req, res);

    expect(auth.refresh).toHaveBeenCalledWith("refresh-antigo");
    expect(res.json).toHaveBeenCalledWith(newTokens);
  });

  it("logout: delega ao AuthService e responde 204 sem corpo", async () => {
    const auth = createAuthService({ logout: vi.fn().mockResolvedValue(undefined) });
    const controller = new AuthController(auth);
    const req = { body: { refreshToken: "refresh-1" } } as Request;
    const res = createRes();

    await controller.logout(req, res);

    expect(auth.logout).toHaveBeenCalledWith("refresh-1");
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });

  it("me: usa req.userId (injetado pelo authGuard) e responde com o perfil", async () => {
    const profile = { id: "1", email: "joao@example.com", createdAt: new Date() };
    const auth = createAuthService({ getProfile: vi.fn().mockResolvedValue(profile) });
    const controller = new AuthController(auth);
    const req = { userId: "1" } as Request;
    const res = createRes();

    await controller.me(req, res);

    expect(auth.getProfile).toHaveBeenCalledWith("1");
    expect(res.json).toHaveBeenCalledWith({ user: profile });
  });
});
