import { Router, type RequestHandler } from "express";
import type { AuthController } from "../controllers/auth-controller.ts";
import { validateBody } from "../middlewares/validate-body.ts";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../schemas/auth-schemas.ts";

export function authRoutes(
  controller: AuthController,
  authGuard: RequestHandler,
): Router {
  const router = Router();

  router.post("/auth/register", validateBody(registerSchema), controller.register);
  router.post("/auth/login", validateBody(loginSchema), controller.login);
  router.post("/auth/refresh", validateBody(refreshSchema), controller.refresh);
  router.post("/auth/logout", validateBody(refreshSchema), controller.logout);
  router.get("/auth/me", authGuard, controller.me);

  return router;
}
