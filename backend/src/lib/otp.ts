import crypto from "crypto";
import { prisma } from "./prisma";
import { allowDevMailCodes, generateOtpCode, hashOtp, sendOtpMail, smtpConfigured } from "./mail";

export type OtpPurpose = "REGISTER" | "LOGIN" | "RESET";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function issueEmailOtp(input: {
  email: string;
  userId?: string;
  purpose: OtpPurpose;
}) {
  const email = input.email.toLowerCase();
  const code = generateOtpCode();
  const challenge = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.emailOtp.updateMany({
    where: { email, purpose: input.purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.emailOtp.create({
    data: {
      email,
      userId: input.userId,
      purpose: input.purpose,
      challenge,
      codeHash: hashOtp(code),
      expiresAt,
    },
  });

  const mail = await sendOtpMail(email, code, input.purpose);
  const expose = !mail.sent && allowDevMailCodes();

  if (!mail.sent && smtpConfigured() && !expose) {
    return {
      ok: false as const,
      error: mail.error || "Failed to send verification email. Check SMTP settings.",
    };
  }

  if (!mail.sent && !expose) {
    return {
      ok: false as const,
      error: "Email delivery is not configured. Set SMTP_* in backend/.env",
    };
  }

  return {
    ok: true as const,
    challengeId: challenge,
    message: mail.sent
      ? "Enter the verification code sent to your email."
      : mail.error
        ? `Email send failed (${mail.error}). Use the demo code shown for local testing.`
        : "SMTP not configured — use the demo code shown (local only).",
    demoOtp: expose ? code : undefined,
    emailSent: mail.sent,
  };
}

export async function verifyEmailOtp(input: {
  challengeId: string;
  code: string;
  purpose: OtpPurpose;
}) {
  const row = await prisma.emailOtp.findUnique({ where: { challenge: input.challengeId } });
  if (!row || row.purpose !== input.purpose) {
    return { ok: false as const, error: "Invalid or expired verification challenge" };
  }
  if (row.consumedAt) {
    return { ok: false as const, error: "Verification code already used" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Verification code expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, error: "Too many attempts. Request a new code." };
  }

  const ok = row.codeHash === hashOtp(input.code.trim());
  if (!ok) {
    await prisma.emailOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "Invalid verification code" };
  }

  await prisma.emailOtp.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  return {
    ok: true as const,
    email: row.email,
    userId: row.userId,
  };
}
