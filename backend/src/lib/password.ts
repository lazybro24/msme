import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hashOrPlain: string) {
  // Only bcrypt hashes are accepted — plaintext legacy compares are disabled.
  if (!hashOrPlain || !hashOrPlain.startsWith("$2")) {
    return false;
  }
  return bcrypt.compare(plain, hashOrPlain);
}
