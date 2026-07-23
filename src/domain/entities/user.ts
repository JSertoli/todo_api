export interface User {
  id: string;
  email: string;
  /** Senha Hasheada bcrypt o texto puro nunca chega aqui. */
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Pick<User, "id" | "email" | "createdAt">;

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}
