import { env } from "./config.ts";
import { prisma } from "./infra/prisma.ts";
import {
  PrismaUserRepository,
  PrismaRefreshTokenRepository,
} from "./infra/repositories.ts";
import { BcryptHashProvider, JwtTokenProvider } from "./infra/providers.ts";
import { AuthService } from "./application/auth-service.ts";
import { createApp } from "./http/app.ts";


const tokenProvider = new JwtTokenProvider(
  env.JWT_ACCESS_SECRET,
  env.JWT_ACCESS_EXPIRES_IN,
);

const authService = new AuthService(
  new PrismaUserRepository(prisma),
  new PrismaRefreshTokenRepository(prisma),
  new BcryptHashProvider(),
  tokenProvider,
  env.REFRESH_TOKEN_EXPIRES_DAYS,
);

const app = createApp(authService, tokenProvider);

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});