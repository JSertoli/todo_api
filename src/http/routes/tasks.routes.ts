import { Router, type RequestHandler } from "express";
import type { TasksController } from "../controllers/tasks-controller.ts";
import { validateBody } from "../middlewares/validate-body.ts";
import { createTaskSchema, updateTaskSchema } from "../schemas/task-schemas.ts";

export function tasksRoutes(
  controller: TasksController,
  authGuard: RequestHandler,
): Router {
  const router = Router();

  router.get("/tasks", authGuard, controller.list);
  router.post("/tasks", authGuard, validateBody(createTaskSchema), controller.create);
  router.put("/tasks/:id", authGuard, validateBody(updateTaskSchema), controller.update);
  router.delete("/tasks/:id", authGuard, controller.remove);

  return router;
}
