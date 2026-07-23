import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type { TasksRepository } from "../../domain/ports/repositories.ts";
import type { Task } from "../../domain/entities/task.ts";

export class PrismaTasksRepository implements TasksRepository {
  constructor(private readonly prisma: PrismaClient) { }

  findByUserId(userId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
  findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }
  create(data: {
    userId: string;
    title: string;
    description?: string;
  }): Promise<Task> {
    return this.prisma.task.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description ?? null,
      },
    });
  }
  update(
    id: string,
    data: { title?: string; description?: string; completed?: boolean },
  ): Promise<Task> {
    return this.prisma.task.update({ where: { id }, data });
  }
  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
