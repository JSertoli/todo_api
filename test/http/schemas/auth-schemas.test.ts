import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../../../src/http/schemas/auth-schemas.ts";

describe("registerSchema", () => {
  it("aceita e-mail e senha válidos", () => {
    const result = registerSchema.safeParse({
      email: "joao@example.com",
      password: "senhaSegura123",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail em formato inválido", () => {
    const result = registerSchema.safeParse({
      email: "nao-e-email",
      password: "senhaSegura123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = registerSchema.safeParse({
      email: "joao@example.com",
      password: "1234567",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha com mais de 72 caracteres (limite do bcrypt)", () => {
    const result = registerSchema.safeParse({
      email: "joao@example.com",
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it("aceita senha de exatamente 72 caracteres (limite)", () => {
    const result = registerSchema.safeParse({
      email: "joao@example.com",
      password: "a".repeat(72),
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("aceita e-mail e senha válidos", () => {
    const result = loginSchema.safeParse({
      email: "joao@example.com",
      password: "qualquer-coisa",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita senha vazia", () => {
    const result = loginSchema.safeParse({ email: "joao@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita corpo sem e-mail", () => {
    const result = loginSchema.safeParse({ password: "qualquer-coisa" });
    expect(result.success).toBe(false);
  });
});

describe("refreshSchema", () => {
  it("aceita um refreshToken não vazio", () => {
    expect(refreshSchema.safeParse({ refreshToken: "abc123" }).success).toBe(true);
  });

  it("rejeita refreshToken vazio", () => {
    expect(refreshSchema.safeParse({ refreshToken: "" }).success).toBe(false);
  });

  it("rejeita corpo sem refreshToken", () => {
    expect(refreshSchema.safeParse({}).success).toBe(false);
  });
});
