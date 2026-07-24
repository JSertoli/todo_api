import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { TasksController } from "../../../src/http/controllers/tasks-controller.ts";
import type { TasksService } from "../../../src/application/tasks-service.ts";

function createRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

function createTasksService(overrides: Partial<TasksService> = {}): TasksService {
  return {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  } as unknown as TasksService;
}

describe("TasksController", () => {
  it("list: usa req.userId (injetado pelo authGuard) e responde com { tasks }", async () => {
    const tasks = [{ id: "1", title: "Comprar pão" }];
    const service = createTasksService({ list: vi.fn().mockResolvedValue(tasks) });
    const controller = new TasksController(service);
    const req = { userId: "user-1" } as Request;
    const res = createRes();

    await controller.list(req, res);

    expect(service.list).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith({ tasks });
  });

  it("create: delega req.userId + req.body e responde 201 com { task }", async () => {
    const task = { id: "1", title: "Nova tarefa" };
    const service = createTasksService({ create: vi.fn().mockResolvedValue(task) });
    const controller = new TasksController(service);
    const req = {
      userId: "user-1",
      body: { title: "Nova tarefa" },
    } as Request;
    const res = createRes();

    await controller.create(req, res);

    expect(service.create).toHaveBeenCalledWith("user-1", { title: "Nova tarefa" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ task });
  });

  it("update: delega req.userId + req.params.id + req.body e responde com { task }", async () => {
    const task = { id: "1", completed: true };
    const service = createTasksService({ update: vi.fn().mockResolvedValue(task) });
    const controller = new TasksController(service);
    const req = {
      userId: "user-1",
      params: { id: "1" },
      body: { completed: true },
    } as unknown as Request;
    const res = createRes();

    await controller.update(req, res);

    expect(service.update).toHaveBeenCalledWith("user-1", "1", { completed: true });
    expect(res.json).toHaveBeenCalledWith({ task });
  });

  it("remove: delega req.userId + req.params.id e responde 204 sem corpo", async () => {
    const service = createTasksService({ remove: vi.fn().mockResolvedValue(undefined) });
    const controller = new TasksController(service);
    const req = { userId: "user-1", params: { id: "1" } } as unknown as Request;
    const res = createRes();

    await controller.remove(req, res);

    expect(service.remove).toHaveBeenCalledWith("user-1", "1");
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});
