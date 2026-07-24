import { describe, it, expect, beforeEach } from "vitest";
import { TasksService } from "../../src/application/tasks-service.ts";
import type { Task } from "../../src/domain/entities/task.ts";
import type { TasksRepository } from "../../src/domain/ports/repositories.ts";


class InMemoryTasksRepository implements TasksRepository {
  private tasks: Task[] = [];

  async findByUserId(userId: string): Promise<Task[]> {
    return this.tasks.filter((t) => t.userId === userId);
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.find((t) => t.id === id) ?? null;
  }

  async create(data: {
    userId: string;
    title: string;
    description?: string;
  }): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      userId: data.userId,
      title: data.title,
      description: data.description ?? null,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.push(task);
    return task;
  }

  async update(
    id: string,
    data: { title?: string; description?: string; completed?: boolean },
  ): Promise<Task> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) throw new Error("task not found (bug no teste, não deveria acontecer)");
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.completed !== undefined) task.completed = data.completed;
    task.updatedAt = new Date();
    return task;
  }

  async delete(id: string): Promise<void> {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index !== -1) this.tasks.splice(index, 1);
  }
}

describe("TasksService", () => {
  let repository: InMemoryTasksRepository;
  let service: TasksService;

  beforeEach(() => {
    repository = new InMemoryTasksRepository();
    service = new TasksService(repository);
  });

  describe("list", () => {
    it("retorna apenas as tarefas do usuário informado", async () => {
      await service.create("user-1", { title: "Tarefa A" });
      await service.create("user-1", { title: "Tarefa B" });
      await service.create("user-2", { title: "Tarefa de outro usuário" });

      const tasks = await service.list("user-1");

      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.userId === "user-1")).toBe(true);
    });

    it("retorna array vazio quando o usuário não tem tarefas", async () => {
      const tasks = await service.list("user-sem-tarefas");

      expect(tasks).toEqual([]);
    });
  });

  describe("create", () => {
    it("cria uma tarefa associada ao usuário, começando como não concluída", async () => {
      const task = await service.create("user-1", {
        title: "Comprar pão",
        description: "na padaria",
      });

      expect(task.userId).toBe("user-1");
      expect(task.title).toBe("Comprar pão");
      expect(task.description).toBe("na padaria");
      expect(task.completed).toBe(false);
    });

    it("permite criar uma tarefa sem descrição (fica null)", async () => {
      const task = await service.create("user-1", { title: "Só o título" });

      expect(task.description).toBeNull();
    });
  });

  describe("update", () => {
    it("atualiza uma tarefa quando o usuário é o dono", async () => {
      const created = await service.create("user-1", { title: "Original" });

      const updated = await service.update("user-1", created.id, { completed: true });

      expect(updated.completed).toBe(true);
      expect(updated.title).toBe("Original");
    });

    it("rejeita atualização de uma tarefa inexistente com 404", async () => {
      await expect(
        service.update("user-1", "id-que-nao-existe", { completed: true }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rejeita atualização de tarefa de OUTRO usuário com 404 (proteção contra IDOR)", async () => {
      const created = await service.create("user-1", { title: "Tarefa do user 1" });

      await expect(
        service.update("user-2", created.id, { title: "modificado por outro usuário" }),
      ).rejects.toMatchObject({ statusCode: 404 });

      const stillOriginal = await repository.findById(created.id);
      expect(stillOriginal?.title).toBe("Tarefa do user 1");
    });
  });

  describe("remove", () => {
    it("remove a tarefa quando o usuário é o dono", async () => {
      const created = await service.create("user-1", { title: "Para deletar" });

      await service.remove("user-1", created.id);

      expect(await repository.findById(created.id)).toBeNull();
    });

    it("rejeita remoção de uma tarefa inexistente com 404", async () => {
      await expect(
        service.remove("user-1", "id-que-nao-existe"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rejeita remoção de tarefa de OUTRO usuário com 404 (proteção contra IDOR)", async () => {
      const created = await service.create("user-1", { title: "Tarefa do user 1" });

      await expect(service.remove("user-2", created.id)).rejects.toMatchObject({
        statusCode: 404,
      });

      expect(await repository.findById(created.id)).not.toBeNull();
    });
  });
});
