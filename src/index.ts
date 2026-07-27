import express from "express";
import { env } from "./config.ts";
import { app, prisma } from "./container.ts";

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} recebido — encerrando...`);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
