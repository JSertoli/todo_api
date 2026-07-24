export interface User {
  id: string;
  name: string;
  email: string;
  /** Senha Hasheada bcrypt o texto puro nunca chega aqui. */
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Pick<User, "id" | "name" | "email" | "createdAt">;

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}
