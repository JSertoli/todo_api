import { describe, it, expect } from "vitest";
import { AppError } from "../src/errors.ts";

describe("AppError", () => {
  it("carrega statusCode e mensagem, e é uma instância de Error", () => {
    const error = new AppError(404, "não encontrado");

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("não encontrado");
    expect(error.name).toBe("AppError");
    expect(error).toBeInstanceOf(Error);
  });
});
