import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import {
  AuthRequest,
  createToken,
  pendingMfa,
  publicUser,
  requireAuth,
  requireRoles,
  revokeToken,
} from "../lib/auth";
import { hashPassword, verifyPassword } from "../lib/password";
import { MIN_PASSWORD_LENGTH } from "../lib/passwordPolicy";
import {
  allowDevMailCodes,
  sendPasswordResetMail,
  sendWelcomeMail,
  smtpConfigured,
} from "../lib/mail";
import { issueEmailOtp, verifyEmailOtp } from "../lib/otp";
import { audit, notify, toAuthUser } from "../lib/users";
import { juryPhotoUpload } from "../lib/upload";
import { persistUploadedFile, publicFilePath } from "../lib/storage";
import {
  buildOtpauthUrl,
  buildQrDataUrl,
  createTotpSecret,
  isRealTotpSecret,
  verifyTotpCode,
} from "../lib/totp";

export const authRouter = Router();

async function registrationAllowed() {
  const regSetting = await prisma.siteSetting.findUnique({ where: { key: "registrationOpen" } });
  const nomSetting = await prisma.siteSetting.findUnique({ where: { key: "nominationsOpen" } });
  const registrationOpen = regSetting ? Boolean(regSetting.value) : true;
  const nominationsOpen = nomSetting ? Boolean(nomSetting.value) : true;
  return registrationOpen && nominationsOpen;
}

authRouter.post("/register", async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(2),
    designation: z.string().optional(),
    organisationName: z.string().min(2),
    mobile: z.string().min(8),
    email: z.string().email(),
    password: z.string().min(MIN_PASSWORD_LENGTH),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!(await registrationAllowed())) {
    return res.status(403).json({ error: "Nominations / registration are currently closed." });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email,
      mobile: parsed.data.mobile,
      fullName: parsed.data.fullName,
      designation: parsed.data.designation,
      passwordHash,
      roles: ["APPLICANT"],
      orgName: parsed.data.organisationName,
      mfaEnabled: false,
      active: true,
    },
  });

  await audit({
    actorId: user.id,
    role: "APPLICANT",
    action: "ACCOUNT_CREATED_PENDING_OTP",
  });

  const otp = await issueEmailOtp({
    email: user.email,
    userId: user.id,
    purpose: "REGISTER",
  });
  if (!otp.ok) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    return res.status(503).json({ error: otp.error });
  }

  res.status(201).json({
    otpRequired: true,
    purpose: "REGISTER",
    challengeId: otp.challengeId,
    message: otp.message,
    demoOtp: otp.demoOtp,
    email: user.email,
  });
});

authRouter.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash || ""))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  if (user.active === false) {
    return res.status(403).json({ error: "Account deactivated" });
  }

  const otp = await issueEmailOtp({
    email: user.email,
    userId: user.id,
    purpose: "LOGIN",
  });
  if (!otp.ok) {
    return res.status(503).json({ error: otp.error });
  }

  res.json({
    otpRequired: true,
    purpose: "LOGIN",
    challengeId: otp.challengeId,
    message: otp.message,
    demoOtp: otp.demoOtp,
    email: user.email,
  });
});

authRouter.post("/verify-otp", async (req, res) => {
  const schema = z.object({
    challengeId: z.string().min(8),
    code: z.string().min(4).max(8),
    purpose: z.enum(["REGISTER", "LOGIN"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const result = await verifyEmailOtp(parsed.data);
  if (!result.ok) return res.status(401).json({ error: result.error });

  const user = result.userId
    ? await prisma.user.findUnique({ where: { id: result.userId } })
    : await prisma.user.findUnique({ where: { email: result.email } });
  if (!user || user.active === false) {
    return res.status(400).json({ error: "User not found" });
  }

  // Google Authenticator required when MFA is enabled with a real TOTP secret
  if (
    parsed.data.purpose === "LOGIN" &&
    user.mfaEnabled &&
    isRealTotpSecret(user.mfaSecret)
  ) {
    const mfaChallenge = crypto.randomBytes(24).toString("hex");
    pendingMfa.set(mfaChallenge, user.id);
    setTimeout(() => pendingMfa.delete(mfaChallenge), 10 * 60 * 1000);
    await audit({
      actorId: user.id,
      role: user.roles[0],
      action: "LOGIN_OTP_VERIFIED_AWAITING_AUTHENTICATOR",
    });
    return res.json({
      authenticatorRequired: true,
      challengeId: mfaChallenge,
      message: "Enter the 6-digit code from Google Authenticator to finish signing in.",
      email: user.email,
    });
  }

  const token = await createToken(user.id, true);
  const authUser = toAuthUser(user);

  if (parsed.data.purpose === "REGISTER") {
    void notify(user.id, "Welcome", "Your applicant account is ready.").catch(() => undefined);
    void audit({
      actorId: user.id,
      role: user.roles[0],
      action: "REGISTER_OTP_VERIFIED",
    }).catch(() => undefined);
    void sendWelcomeMail(user.email, user.fullName, user.orgName);
  } else {
    void audit({
      actorId: user.id,
      role: user.roles[0],
      action: "LOGIN_OTP_VERIFIED",
    }).catch(() => undefined);
  }

  res.json({
    token,
    user: publicUser(authUser),
    message:
      parsed.data.purpose === "REGISTER"
        ? "Account verified. Welcome."
        : "Signed in successfully.",
  });
});

authRouter.post("/verify-totp", async (req, res) => {
  const schema = z.object({
    challengeId: z.string().min(8),
    code: z.string().min(6).max(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = pendingMfa.get(parsed.data.challengeId);
  if (!userId) {
    return res.status(401).json({ error: "Authenticator challenge expired. Sign in again." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.active === false || !user.mfaEnabled || !isRealTotpSecret(user.mfaSecret)) {
    pendingMfa.delete(parsed.data.challengeId);
    return res.status(400).json({ error: "Authenticator MFA is not available for this account." });
  }

  const ok = await verifyTotpCode(user.mfaSecret!, parsed.data.code);
  if (!ok) return res.status(401).json({ error: "Invalid authenticator code" });

  pendingMfa.delete(parsed.data.challengeId);
  const token = await createToken(user.id, true);
  await audit({
    actorId: user.id,
    role: user.roles[0],
    action: "LOGIN_AUTHENTICATOR_VERIFIED",
  });
  res.json({
    token,
    user: publicUser(toAuthUser(user)),
    message: "Signed in successfully.",
  });
});

/** Alias for older MFA clients — same as verify-otp LOGIN */
authRouter.post("/mfa", async (req, res) => {
  const schema = z.object({
    challengeId: z.string(),
    code: z.string().min(4),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  req.body = { ...parsed.data, purpose: "LOGIN" };
  // Reuse verify-otp logic via internal call pattern
  const result = await verifyEmailOtp({
    challengeId: parsed.data.challengeId,
    code: parsed.data.code,
    purpose: "LOGIN",
  });
  if (!result.ok) return res.status(401).json({ error: result.error });
  const user = result.userId
    ? await prisma.user.findUnique({ where: { id: result.userId } })
    : null;
  if (!user) return res.status(400).json({ error: "User not found" });
  const token = await createToken(user.id, true);
  await audit({
    actorId: user.id,
    role: user.roles[0],
    action: "LOGIN_OTP_VERIFIED",
  });
  res.json({ token, user: publicUser(toAuthUser(user)) });
});

authRouter.post("/resend-otp", async (req, res) => {
  const schema = z.object({
    challengeId: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const row = await prisma.emailOtp.findUnique({ where: { challenge: parsed.data.challengeId } });
  if (!row || row.consumedAt) {
    return res.status(400).json({ error: "Invalid challenge. Start login/register again." });
  }

  const otp = await issueEmailOtp({
    email: row.email,
    userId: row.userId ?? undefined,
    purpose: row.purpose as "REGISTER" | "LOGIN" | "RESET",
  });
  if (!otp.ok) return res.status(503).json({ error: otp.error });

  res.json({
    otpRequired: true,
    purpose: row.purpose,
    challengeId: otp.challengeId,
    message: otp.message,
    demoOtp: otp.demoOtp,
    email: row.email,
  });
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const fresh = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!fresh) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(toAuthUser(fresh)) });
});

/** Start Google Authenticator MFA — returns QR to scan (does not enable until confirm). */
authRouter.post("/me/mfa/setup", requireAuth, async (req: AuthRequest, res) => {
  const fresh = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!fresh) return res.status(404).json({ error: "User not found" });
  if (fresh.mfaEnabled && isRealTotpSecret(fresh.mfaSecret)) {
    return res.status(400).json({
      error: "MFA is already enabled. Disable it first to set up a new authenticator.",
    });
  }

  const secret = await createTotpSecret();
  const otpauthUrl = await buildOtpauthUrl(fresh.email, secret);
  const qrDataUrl = await buildQrDataUrl(otpauthUrl);

  await prisma.user.update({
    where: { id: fresh.id },
    data: { mfaSecret: secret, mfaEnabled: false },
  });

  await audit({
    actorId: fresh.id,
    role: fresh.roles[0],
    action: "MFA_SETUP_STARTED",
  });

  res.json({
    secret,
    otpauthUrl,
    qrDataUrl,
    message: "Scan this QR code with Google Authenticator, then enter the 6-digit code to enable MFA.",
  });
});

/** Confirm setup with a code from Google Authenticator. */
authRouter.post("/me/mfa/confirm", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({ code: z.string().min(6).max(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const fresh = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!fresh || !isRealTotpSecret(fresh.mfaSecret)) {
    return res.status(400).json({ error: "Start MFA setup first to get a QR code." });
  }

  const ok = await verifyTotpCode(fresh.mfaSecret!, parsed.data.code);
  if (!ok) return res.status(401).json({ error: "Invalid authenticator code. Try the current code." });

  const updated = await prisma.user.update({
    where: { id: fresh.id },
    data: { mfaEnabled: true },
  });

  await audit({
    actorId: fresh.id,
    role: fresh.roles[0],
    action: "MFA_ENABLED_SELF",
  });

  res.json({
    user: publicUser(toAuthUser(updated)),
    message: "Google Authenticator MFA is now enabled. You will need it on every login.",
  });
});

/** Disable MFA — requires a current Google Authenticator code. */
authRouter.post("/me/mfa/disable", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({ code: z.string().min(6).max(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const fresh = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!fresh || !fresh.mfaEnabled || !isRealTotpSecret(fresh.mfaSecret)) {
    return res.status(400).json({ error: "MFA is not enabled on this account." });
  }

  const ok = await verifyTotpCode(fresh.mfaSecret!, parsed.data.code);
  if (!ok) return res.status(401).json({ error: "Invalid authenticator code" });

  const updated = await prisma.user.update({
    where: { id: fresh.id },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  await audit({
    actorId: fresh.id,
    role: fresh.roles[0],
    action: "MFA_DISABLED_SELF",
  });

  res.json({
    user: publicUser(toAuthUser(updated)),
    message: "Google Authenticator MFA has been disabled.",
  });
});

/** @deprecated Use /me/mfa/setup + /me/mfa/confirm */
authRouter.patch("/me/mfa", requireAuth, async (_req: AuthRequest, res) => {
  res.status(400).json({
    error:
      "Use Google Authenticator setup: enable MFA from your profile (scan QR, then confirm with a 6-digit code).",
  });
});

authRouter.patch(
  "/me/profile",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      mobile: z.string().optional(),
      bio: z.string().max(2000).optional(),
      linkedin: z.string().max(300).optional(),
      website: z.string().max(300).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        mobile: parsed.data.mobile,
        bio: parsed.data.bio,
        linkedin: parsed.data.linkedin,
        website: parsed.data.website,
      },
    });

    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "JURY_PROFILE_SELF_UPDATED",
      afterJson: {
        mobile: updated.mobile,
        bio: updated.bio,
        linkedin: updated.linkedin,
        website: updated.website,
      },
    });

    res.json({ user: publicUser(toAuthUser(updated)), message: "Profile updated." });
  },
);

authRouter.post(
  "/me/conduct",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { conductAcceptedAt: new Date() },
    });
    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "CONDUCT_ACCEPTED",
    });
    res.json({
      user: publicUser(toAuthUser(updated)),
      message: "Code of Conduct accepted.",
    });
  },
);

authRouter.post(
  "/me/photo",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR"),
  (req: AuthRequest, res) => {
    juryPhotoUpload.single("photo")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });
      if (!req.file) return res.status(400).json({ error: "Photo file required" });
      const photoUrl = publicFilePath("jury", req.file.filename);
      await persistUploadedFile({
        kind: "jury",
        filename: req.file.filename,
        absolutePath: req.file.path,
        contentType: req.file.mimetype,
      });
      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: { photoUrl },
      });
      await audit({
        actorId: req.user!.id,
        role: req.user!.roles[0],
        action: "JURY_PHOTO_SELF_UPDATED",
        afterJson: { photoUrl },
      });
      res.json({ user: publicUser(toAuthUser(updated)), photoUrl });
    });
  },
);

authRouter.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  if (req.sessionToken) await revokeToken(req.sessionToken);
  res.json({ ok: true });
});

authRouter.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash || ""))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      ...(req.sessionToken ? { NOT: { token: req.sessionToken } } : {}),
    },
  });
  await audit({
    actorId: user.id,
    role: user.roles[0],
    action: "PASSWORD_CHANGED_SELF",
  });
  res.json({ ok: true, message: "Password updated." });
});

authRouter.post("/forgot-password", async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  const generic = { ok: true, message: "If that account exists, a reset link was sent." };
  if (!user || user.active === false) return res.json(generic);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });
  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
  const link = `${origin}/nominate/reset-password?token=${token}`;
  const mail = await sendPasswordResetMail(user.email, user.fullName, link);

  await audit({
    actorId: user.id,
    role: user.roles[0],
    action: "PASSWORD_RESET_REQUESTED",
  });

  if (mail.sent) return res.json(generic);

  if (smtpConfigured()) {
    return res.status(503).json({
      error: mail.error || "Could not send reset email. Check SMTP configuration.",
    });
  }

  if (!allowDevMailCodes()) {
    return res.status(503).json({
      error: "SMTP is not configured. Set SMTP_* in backend/.env to send reset emails.",
    });
  }

  res.json({
    ...generic,
    message: "SMTP not configured — use the demo reset link (local only).",
    demoResetToken: token,
    demoResetLink: link,
  });
});

authRouter.post("/reset-password", async (req, res) => {
  const schema = z.object({
    token: z.string().min(10),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const row = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  await prisma.session.deleteMany({ where: { userId: row.userId } });
  await audit({
    actorId: row.userId,
    action: "PASSWORD_RESET_COMPLETED",
  });
  res.json({ ok: true, message: "Password reset. You can sign in now." });
});

authRouter.get("/mail-status", (_req, res) => {
  res.json({
    smtpConfigured: smtpConfigured(),
    otpDevExpose: allowDevMailCodes(),
  });
});

authRouter.get("/demo-users", async (_req, res) => {
  const enabled =
    process.env.DEMO_USERS_ENABLED === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.DEMO_USERS_ENABLED !== "false");
  if (!enabled) {
    return res.status(404).json({ error: "Not found" });
  }
  const users = await prisma.user.findMany({
    select: { email: true, roles: true, mfaEnabled: true },
  });
  res.json({
    users: users.map((u) => ({
      email: u.email,
      roles: u.roles,
      note: "Passwords are not listed. Use SEED_PASSWORD from server env for seeded accounts.",
    })),
  });
});
