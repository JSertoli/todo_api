import type { Request, Response } from "express";
import type { TasksService } from "../../application/tasks-service.ts";

export class TasksController {
  constructor(private readonly tasks: TasksService) { }

  list = async (req: Request, res: Response): Promise<void> => {
    const tasks = await this.tasks.list(req.userId!);
    res.json({ tasks });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const task = await this.tasks.create(req.userId!, req.body);
    res.status(201).json({ task });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const taskId = req.params.id as string;
    const task = await this.tasks.update(req.userId!, taskId, req.body);
    res.json({ task });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const taskId = req.params.id as string;
    await this.tasks.remove(req.userId!, taskId);
    res.status(204).send();
  };
}
