import { describe, it, expect } from "vitest";
import { toPublicUser } from "../../../src/domain/entities/user.ts";
import type { User } from "../../../src/domain/entities/user.ts";

describe("toPublicUser", () => {
  it("mantém apenas id, email e createdAt (remove password e updatedAt)", () => {
    const user: User = {
      id: "1",
      email: "joao@example.com",
      password: "hash-secreto",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    };

    const publicUser = toPublicUser(user);

    expect(publicUser).toEqual({
      id: "1",
      email: "joao@example.com",
      createdAt: user.createdAt,
    });
    expect(publicUser).not.toHaveProperty("password");
    expect(publicUser).not.toHaveProperty("updatedAt");
  });
});
