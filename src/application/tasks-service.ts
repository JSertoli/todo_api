import type { TasksRepository } from "../domain/ports/repositories.ts";
import type { Task } from "../domain/entities/task.ts";
import { AppError } from "../errors.ts";

export class TasksService {
  constructor(private readonly tasks: TasksRepository) { }

  list(userId: string): Promise<Task[]> {
    return this.tasks.findByUserId(userId);
  }

  create(
    userId: string,
    data: { title: string; description?: string },
  ): Promise<Task> {
    return this.tasks.create({ userId, ...data });
  }

  async update(
    userId: string,
    taskId: string,
    data: { title?: string; description?: string; completed?: boolean },
  ): Promise<Task> {
    await this.ensureOwner(userId, taskId);
    return this.tasks.update(taskId, data);
  }

  async remove(userId: string, taskId: string): Promise<void> {
    await this.ensureOwner(userId, taskId);
    await this.tasks.delete(taskId);
  }

  private async ensureOwner(userId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findById(taskId);
    if (!task || task.userId !== userId) {
      throw new AppError(404, "Tarefa não encontrada.");
    }
    return task;
  }
}
