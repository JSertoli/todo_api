import { describe, it, expect } from "vitest";
import { BcryptHashProvider } from "../../../src/infra/providers/bcrypt-hash-provider.ts";

describe("BcryptHashProvider", () => {
  const provider = new BcryptHashProvider();

  it("gera um hash diferente do texto original", async () => {
    const hashed = await provider.hash("minhaSenha123");

    expect(hashed).not.toBe("minhaSenha123");
    expect(hashed.length).toBeGreaterThan(0);
  });

  it("compare retorna true para a senha correta", async () => {
    const hashed = await provider.hash("minhaSenha123");

    await expect(provider.compare("minhaSenha123", hashed)).resolves.toBe(true);
  });

  it("compare retorna false para uma senha incorreta", async () => {
    const hashed = await provider.hash("minhaSenha123");

    await expect(provider.compare("outraSenha", hashed)).resolves.toBe(false);
  });

  it("hashes do mesmo texto são diferentes entre si (salt aleatório)", async () => {
    const a = await provider.hash("minhaSenha123");
    const b = await provider.hash("minhaSenha123");

    expect(a).not.toBe(b);
    // mas ambos continuam validando contra o texto original
    await expect(provider.compare("minhaSenha123", a)).resolves.toBe(true);
    await expect(provider.compare("minhaSenha123", b)).resolves.toBe(true);
  });
});
