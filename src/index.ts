import { env } from "./config.ts";
import { app, prisma } from "./container.ts";

const server = app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});

// Encerramento gracioso: importante em plataformas como Render, que enviam
// SIGTERM antes de matar o processo em redeploys/reinícios — fecha o
// servidor e a conexão com o banco em vez de derrubar requisições em voo.
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} recebido — encerrando...`);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
