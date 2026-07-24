import { describe, it, expect, vi } from "vitest";
import { z, ZodError } from "zod";
import type { Request, Response } from "express";
import { errorHandler } from "../../../src/http/middlewares/error-handler.ts";
import { AppError } from "../../../src/errors.ts";
import { env } from "../../../src/config.ts";

function createRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("errorHandler", () => {
  it("traduz AppError para o statusCode e a mensagem correspondentes", () => {
    const res = createRes();
    const error = new AppError(409, "Já existe uma conta com este e-mail.");

    errorHandler(error, {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "Já existe uma conta com este e-mail.",
    });
  });

  it("traduz ZodError para 400 com a lista de campos inválidos", () => {
    const res = createRes();
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "invalido" });
    expect(result.success).toBe(false);

    errorHandler((result as { error: ZodError }).error, {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(payload.error).toBe("Dados inválidos.");
    expect(payload.details).toEqual([{ field: "email", message: expect.any(String) }]);
  });

  it("traduz erros desconhecidos para 500, sem vazar detalhes fora de development", () => {
    const res = createRes();
    const unknownError = new Error("boom - detalhe interno sensível");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    errorHandler(unknownError, {} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(payload.error).toBe("Erro interno do servidor.");
    if (env.NODE_ENV === "development") {
      expect(payload.detail).toContain("boom");
    } else {
      expect(payload).not.toHaveProperty("detail");
    }

    consoleSpy.mockRestore();
  });
});
