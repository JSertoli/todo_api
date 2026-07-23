import { env } from "./config.ts";
import { prisma } from "./infra/prisma.ts";
import { PrismaUserRepository } from "./infra/repositories/prisma-user-repository.ts";
import { PrismaRefreshTokenRepository } from "./infra/repositories/prisma-refresh-token-repository.ts";
import { PrismaTasksRepository } from "./infra/repositories/prisma-tasks-repository.ts";
import { BcryptHashProvider } from "./infra/providers/bcrypt-hash-provider.ts";
import { JwtTokenProvider } from "./infra/providers/jwt-token-provider.ts";
import { AuthService } from "./application/auth-service.ts";
import { TasksService } from "./application/tasks-service.ts";
import { AuthController } from "./http/controllers/auth-controller.ts";
import { TasksController } from "./http/controllers/tasks-controller.ts";
import { ensureAuthenticated } from "./http/middlewares/ensure-authenticated.ts";
import { authRoutes } from "./http/routes/auth.routes.ts";
import { tasksRoutes } from "./http/routes/tasks.routes.ts";
import { createApp } from "./http/app.ts";


const tokenProvider = new JwtTokenProvider(
  env.JWT_ACCESS_SECRET,
  env.JWT_ACCESS_EXPIRES_IN,
);
const hashProvider = new BcryptHashProvider();
const userRepository = new PrismaUserRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const tasksRepository = new PrismaTasksRepository(prisma);

const authService = new AuthService(
  userRepository,
  refreshTokenRepository,
  hashProvider,
  tokenProvider,
  env.REFRESH_TOKEN_EXPIRES_DAYS,
);
const tasksService = new TasksService(tasksRepository);

// Injetando dependências nos controllers e routers (improvisado)
const authGuard = ensureAuthenticated(tokenProvider);
const routers = [
  authRoutes(new AuthController(authService), authGuard),
  tasksRoutes(new TasksController(tasksService), authGuard),
];

export const app = createApp(routers);
