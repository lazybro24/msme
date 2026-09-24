/**
 * One-time admin bootstrap from env.
 *
 * Set BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD (optional NAME).
 * On API start: if no ADMINISTRATOR exists, create one and stop.
 * Never overwrites an existing admin or resets passwords from env.
 *
 * After first successful boot, remove the password from host env / .env.
 */
import { prisma } from "./prisma";
import { hashPassword } from "./password";
import { MIN_PASSWORD_LENGTH } from "./passwordPolicy";

export async function bootstrapAdminFromEnv(): Promise<void> {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  const fullName = (process.env.BOOTSTRAP_ADMIN_NAME || "Awards Administrator").trim();

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    console.warn(
      "[bootstrap] Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD, or neither.",
    );
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.warn(
      `[bootstrap] BOOTSTRAP_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters. Skipped.`,
    );
    return;
  }

  if (password === "demo") {
    console.warn('[bootstrap] Refusing password "demo". Skipped.');
    return;
  }

  const adminCount = await prisma.user.count({
    where: { roles: { has: "ADMINISTRATOR" } },
  });
  if (adminCount > 0) {
    console.log(
      "[bootstrap] Administrator already exists — env bootstrap skipped (password not changed).",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.warn(
      `[bootstrap] User ${email} already exists without ADMINISTRATOR role. Skipped — use Users UI or create-admin.`,
    );
    return;
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

  console.log(
    `[bootstrap] Created ADMINISTRATOR ${user.email} (${user.id}). Remove BOOTSTRAP_ADMIN_PASSWORD from env now.`,
  );
}
