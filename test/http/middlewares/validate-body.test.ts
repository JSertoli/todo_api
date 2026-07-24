import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { validateBody } from "../../../src/http/middlewares/validate-body.ts";

describe("validateBody", () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  it("substitui req.body pelos dados validados e chama next() sem erro", () => {
    const middleware = validateBody(schema);
    const req = {
      body: {
        email: "joao@example.com",
        password: "senhaSegura123",
        campoNaoDeclarado: "deve ser removido",
      },
    } as unknown as Request;
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(req.body).toEqual({
      email: "joao@example.com",
      password: "senhaSegura123",
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("chama next com o ZodError quando o body é inválido (não gera resposta sozinho)", () => {
    const middleware = validateBody(schema);
    const req = {
      body: { email: "nao-e-email", password: "123" },
    } as unknown as Request;
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = next.mock.calls[0]?.[0];
    expect(errorArg.name).toBe("ZodError");
  });
});
