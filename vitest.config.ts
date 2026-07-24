import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/application/auth-service.ts",
        "src/domain/entities/user.ts",
        "src/errors.ts",
        "src/http/controllers/auth-controller.ts",
        "src/http/middlewares/**/*.ts",
        "src/http/schemas/auth-schemas.ts",
        "src/infra/providers/**/*.ts",
      ],
    },
  },
});
