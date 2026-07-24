import { describe, it, expect } from "vitest";
import { createTaskSchema, updateTaskSchema } from "../../../src/http/schemas/task-schemas.ts";

describe("createTaskSchema", () => {
  it("aceita título e descrição válidos", () => {
    const result = createTaskSchema.safeParse({
      title: "Comprar pão",
      description: "na padaria",
    });
    expect(result.success).toBe(true);
  });

  it("aceita apenas o título (descrição é opcional)", () => {
    const result = createTaskSchema.safeParse({ title: "Comprar pão" });
    expect(result.success).toBe(true);
  });

  it("rejeita título vazio", () => {
    const result = createTaskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita corpo sem título", () => {
    const result = createTaskSchema.safeParse({ description: "sem título" });
    expect(result.success).toBe(false);
  });

  it("rejeita título com mais de 200 caracteres", () => {
    const result = createTaskSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("aceita título de exatamente 200 caracteres (limite)", () => {
    const result = createTaskSchema.safeParse({ title: "a".repeat(200) });
    expect(result.success).toBe(true);
  });

  it("rejeita descrição com mais de 2000 caracteres", () => {
    const result = createTaskSchema.safeParse({
      title: "válido",
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("aceita objeto vazio — todos os campos são opcionais no update", () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("aceita atualizar apenas 'completed'", () => {
    const result = updateTaskSchema.safeParse({ completed: true });
    expect(result.success).toBe(true);
  });

  it("rejeita título vazio quando informado", () => {
    const result = updateTaskSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita 'completed' que não seja booleano", () => {
    const result = updateTaskSchema.safeParse({ completed: "sim" });
    expect(result.success).toBe(false);
  });

  it("rejeita título com mais de 200 caracteres", () => {
    const result = updateTaskSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});
