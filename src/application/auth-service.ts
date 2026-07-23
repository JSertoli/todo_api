import type {
  UserRepository,
  RefreshTokenRepository,
  HashProvider,
  TokenProvider,
} from "../domain/ports.ts";
import { toPublicUser, type PublicUser } from "../domain/entities.ts";
import { AppError } from "../errors.ts";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface Session extends AuthTokens {
  user: PublicUser;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly hash: HashProvider,
    private readonly tokens: TokenProvider,
    private readonly refreshTtlDays: number,
  ) { }

  async register(email: string, password: string): Promise<PublicUser> {
    const normalized = email.trim().toLowerCase();
    if (await this.users.findByEmail(normalized)) {
      throw new AppError(409, "Já existe uma conta com este e-mail.");
    }
    const user = await this.users.create({
      email: normalized,
      password: await this.hash.hash(password),
    });
    return toPublicUser(user);
  }

  async login(email: string, password: string): Promise<Session> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user || !(await this.hash.compare(password, user.password))) {
      throw new AppError(401, "E-mail ou senha inválidos.");
    }
    return { user: toPublicUser(user), ...(await this.issueTokens(user.id)) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.refreshTokens.findByHash(
      this.tokens.hashRefreshToken(refreshToken),
    );
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "Sessão inválida ou expirada. Faça login novamente.");
    }
    // Rotação de tokens: o refresh usado é revogado e um novo é emitido
    await this.refreshTokens.revoke(stored.id);
    return this.issueTokens(stored.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokens.findByHash(
      this.tokens.hashRefreshToken(refreshToken),
    );
    if (stored && !stored.revokedAt) {
      await this.refreshTokens.revoke(stored.id);
    }
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError(401, "Usuário não encontrado.");
    return toPublicUser(user);
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const accessToken = this.tokens.generateAccessToken(userId);
    const refreshToken = this.tokens.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlDays * 86_400_000);
    await this.refreshTokens.create({
      tokenHash: this.tokens.hashRefreshToken(refreshToken),
      userId,
      expiresAt,
    });
    return { accessToken, refreshToken };
  }
}
