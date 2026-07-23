import bcrypt from "bcrypt";
import type { HashProvider } from "../../domain/ports/providers.ts";

const SALT_ROUNDS = 12;

export class BcryptHashProvider implements HashProvider {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }
  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
