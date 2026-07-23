import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 lê a configuração daqui (o .env NÃO é carregado automaticamente pelo Prisma,
// por isso o `import "dotenv/config"` acima).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
