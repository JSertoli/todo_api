import type { User } from "../entities/user.ts";
import type { RefreshToken } from "../entities/refresh-token.ts";
import type { Task } from "../entities/task.ts";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: { email: string; password: string }): Promise<User>;
}

export interface RefreshTokenRepository {
  create(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken>;
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<void>;
}

export interface TasksRepository {
  findByUserId(userId: string): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  create(data: {
    userId: string;
    title: string;
    description?: string;
  }): Promise<Task>;
  update(
    id: string,
    data: { title?: string; description?: string; completed?: boolean },
  ): Promise<Task>;
  delete(id: string): Promise<void>;
}
