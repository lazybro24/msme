/**
 * One-off admin bootstrap (CLI). Prefer this or BOOTSTRAP_ADMIN_* env on first API start.
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/create-admin.ts admin@yourdomain.com "Your Strong Password" "Admin Name"
 *
 * Or from env (same rules as server bootstrap):
 *   BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
 *
 * Requires DATABASE_URL in .env
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { MIN_PASSWORD_LENGTH } from "../src/lib/passwordPolicy";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || process.env.BOOTSTRAP_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = process.argv[3] || process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  const fullName = (
    process.argv[4] ||
    process.env.BOOTSTRAP_ADMIN_NAME ||
    "Awards Administrator"
  ).trim();

  if (!email || !password) {
    console.error(
      'Usage: npx tsx scripts/create-admin.ts <email> <password> [fullName]\n' +
        "   or set BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD",
    );
    process.exit(1);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }
  if (password === "demo") {
    console.error('Refusing password "demo". Choose a strong password.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User already exists: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      designation: "Awards Administrator",
      roles: ["ADMINISTRATOR"],
      mfaEnabled: false,
      active: true,
    },
  });

  console.log(`Created ADMINISTRATOR: ${user.email} (${user.id})`);
  console.log("Remove BOOTSTRAP_ADMIN_PASSWORD from env if you used it.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
