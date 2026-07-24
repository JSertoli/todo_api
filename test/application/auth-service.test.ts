import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../../src/application/auth-service.ts";
import type { User } from "../../src/domain/entities/user.ts";
import type { RefreshToken } from "../../src/domain/entities/refresh-token.ts";
import type {
  UserRepository,
  RefreshTokenRepository,
} from "../../src/domain/ports/repositories.ts";
import type { HashProvider, TokenProvider } from "../../src/domain/ports/providers.ts";

class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async create(data: { email: string; password: string }): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      email: data.email,
      password: data.password,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }
}

class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly items: RefreshToken[] = [];

  async create(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    const token: RefreshToken = {
      id: crypto.randomUUID(),
      tokenHash: data.tokenHash,
      userId: data.userId,
      expiresAt: data.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };
    this.items.push(token);
    return token;
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.items.find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async revoke(id: string): Promise<void> {
    const token = this.items.find((t) => t.id === id);
    if (token) token.revokedAt = new Date();
  }
}

// Hash "fake" determinístico sempre irá gerar uma string "hashed:{variable}"
function createHashProvider(): HashProvider {
  return {
    hash: vi.fn(async (plain: string) => `hashed:${plain}`),
    compare: vi.fn(async (plain: string, hashed: string) => hashed === `hashed:${plain}`),
  };
}

// Token "fake": determinístico, permite inspecionar exatamente o que o
// AuthService pede para cada provider 
function createTokenProvider(): TokenProvider {
  let counter = 0;
  return {
    generateAccessToken: vi.fn((userId: string) => `access-token-for-${userId}`),
    verifyAccessToken: vi.fn((token: string) => ({
      userId: token.replace("access-token-for-", ""),
    })),
    generateRefreshToken: vi.fn(() => `refresh-token-${++counter}`),
    hashRefreshToken: vi.fn((token: string) => `hash-of-${token}`),
  };
}

describe("AuthService", () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let hash: HashProvider;
  let tokens: TokenProvider;
  let service: AuthService;

  const REFRESH_TTL_DAYS = 7;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    hash = createHashProvider();
    tokens = createTokenProvider();
    service = new AuthService(users, refreshTokens, hash, tokens, REFRESH_TTL_DAYS);
  });

  describe("register", () => {
    it("cria um usuário com e-mail normalizado (trim + lowercase) e senha hasheada", async () => {
      const result = await service.register("  Joao@Example.COM  ", "senhaSegura123");

      expect(result.email).toBe("joao@example.com");
      expect(result).not.toHaveProperty("password");

      const stored = await users.findByEmail("joao@example.com");
      expect(stored?.password).toBe("hashed:senhaSegura123");
    });

    it("rejeita registro com e-mail já cadastrado, mesmo com capitalização/espaços diferentes", async () => {
      await service.register("joao@example.com", "senhaSegura123");

      await expect(
        service.register("  JOAO@EXAMPLE.COM  ", "outraSenha123"),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("login", () => {
    it("autentica com credenciais corretas e emite access + refresh token", async () => {
      const created = await service.register("joao@example.com", "senhaSegura123");

      const session = await service.login("joao@example.com", "senhaSegura123");

      expect(session.user).toEqual(created);
      expect(session.accessToken).toBe(`access-token-for-${created.id}`);
      expect(session.refreshToken).toMatch(/^refresh-token-/);
    });

    it("normaliza o e-mail (trim + lowercase) ao autenticar", async () => {
      await service.register("joao@example.com", "senhaSegura123");

      const session = await service.login("  JOAO@Example.com  ", "senhaSegura123");

      expect(session.user.email).toBe("joao@example.com");
    });

    it("rejeita login com e-mail inexistente", async () => {
      await expect(
        service.login("naoexiste@example.com", "qualquer"),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("rejeita login com senha incorreta", async () => {
      await service.register("joao@example.com", "senhaSegura123");

      await expect(
        service.login("joao@example.com", "senhaErrada"),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("persiste o refresh token apenas com o hash (nunca o valor puro)", async () => {
      await service.register("joao@example.com", "senhaSegura123");

      const session = await service.login("joao@example.com", "senhaSegura123");

      const stored = await refreshTokens.findByHash(
        tokens.hashRefreshToken(session.refreshToken),
      );
      expect(stored).not.toBeNull();
      expect(stored?.tokenHash).not.toBe(session.refreshToken);
    });
  });

  describe("refresh", () => {
    it("emite um novo par de tokens e revoga (rotaciona) o refresh usado", async () => {
      await service.register("joao@example.com", "senhaSegura123");
      const session = await service.login("joao@example.com", "senhaSegura123");

      const renewed = await service.refresh(session.refreshToken);

      expect(renewed.accessToken).toBeTruthy();
      expect(renewed.refreshToken).not.toBe(session.refreshToken);

      const oldStored = await refreshTokens.findByHash(
        tokens.hashRefreshToken(session.refreshToken),
      );
      expect(oldStored?.revokedAt).not.toBeNull();
    });

    it("rejeita um refresh token que nunca existiu", async () => {
      await expect(service.refresh("token-fantasma")).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("rejeita reuso do refresh token antigo após a rotação", async () => {
      await service.register("joao@example.com", "senhaSegura123");
      const session = await service.login("joao@example.com", "senhaSegura123");
      await service.refresh(session.refreshToken);

      await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("rejeita um refresh token expirado", async () => {
      await service.register("joao@example.com", "senhaSegura123");
      const session = await service.login("joao@example.com", "senhaSegura123");

      const stored = await refreshTokens.findByHash(
        tokens.hashRefreshToken(session.refreshToken),
      );
      stored!.expiresAt = new Date(Date.now() - 1000); // força expiração

      await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("o novo refresh token emitido continua funcionando normalmente", async () => {
      await service.register("joao@example.com", "senhaSegura123");
      const session = await service.login("joao@example.com", "senhaSegura123");

      const renewed = await service.refresh(session.refreshToken);
      const renewedAgain = await service.refresh(renewed.refreshToken);

      expect(renewedAgain.refreshToken).not.toBe(renewed.refreshToken);
    });
  });

  describe("logout", () => {
    it("revoga o refresh token informado", async () => {
      await service.register("joao@example.com", "senhaSegura123");
      const session = await service.login("joao@example.com", "senhaSegura123");

      await service.logout(session.refreshToken);

      const stored = await refreshTokens.findByHash(
        tokens.hashRefreshToken(session.refreshToken),
      );
      expect(stored?.revokedAt).not.toBeNull();
    });

    it("depois do logout, o refresh token não pode mais ser usado", async () => {
      await service.register("joao@example.com", "senhaSegura123");
      const session = await service.login("joao@example.com", "senhaSegura123");
      await service.logout(session.refreshToken);

      await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it("é idempotente: token inexistente não lança erro", async () => {
      await expect(service.logout("token-que-nunca-existiu")).resolves.toBeUndefined();
    });

    it("é idempotente: token já revogado não lança erro", async () => {
      await service.register("joao@example.com", "senhaSegura123");
      const session = await service.login("joao@example.com", "senhaSegura123");
      await service.logout(session.refreshToken);

      await expect(service.logout(session.refreshToken)).resolves.toBeUndefined();
    });
  });

  describe("getProfile", () => {
    it("retorna os dados públicos do usuário autenticado", async () => {
      const created = await service.register("joao@example.com", "senhaSegura123");

      const profile = await service.getProfile(created.id);

      expect(profile).toEqual(created);
    });

    it("rejeita um id de usuário inexistente", async () => {
      await expect(service.getProfile("id-que-nao-existe")).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });
});
