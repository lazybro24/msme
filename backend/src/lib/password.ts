import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hashOrPlain: string) {
  // Support legacy demo users that still store plaintext
  if (!hashOrPlain.startsWith("$2")) {
    return plain === hashOrPlain;
  }
  return bcrypt.compare(plain, hashOrPlain);
}
