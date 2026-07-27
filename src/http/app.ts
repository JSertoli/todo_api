import express, { type Express, type Router } from "express";
import { errorHandler } from "./middlewares/error-handler.ts";
import { globalRateLimiter } from "./middlewares/rate-limit.ts";

export function createApp(routers: Router[]): Express {
  const app = express();

  app.use(globalRateLimiter);
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  for (const router of routers) {
    app.use(router);
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  app.use(errorHandler);
  return app;
}
