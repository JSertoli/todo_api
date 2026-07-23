import express, { type Express } from "express";
import type { AuthService } from "../application/auth-service.ts";
import type { TokenProvider } from "../domain/ports.ts";
import { AuthController } from "./auth-controller.ts";
import {
  validateBody,
  ensureAuthenticated,
  errorHandler,
} from "./middlewares.ts";
import { registerSchema, loginSchema, refreshSchema } from "./schemas.ts";

// Aqui é criado o app express instanciando a controller
export function createApp(auth: AuthService, tokens: TokenProvider): Express {
  const app = express();
  app.use(express.json());

  const c = new AuthController(auth);

  // Rota de health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/auth/register", validateBody(registerSchema), c.register);
  app.post("/auth/login", validateBody(loginSchema), c.login);
  app.post("/auth/refresh", validateBody(refreshSchema), c.refresh);
  app.post("/auth/logout", validateBody(refreshSchema), c.logout);
  app.get("/auth/me", ensureAuthenticated(tokens), c.me);

  app.use(errorHandler);
  return app;
}
