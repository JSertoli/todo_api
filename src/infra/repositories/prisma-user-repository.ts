import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type { UserRepository } from "../../domain/ports/repositories.ts";
import type { User } from "../../domain/entities/user.ts";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
  create(data: { email: string; password: string }): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
