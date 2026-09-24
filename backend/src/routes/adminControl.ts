import { Router } from "express";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth, requireRoles } from "../lib/auth";
import { hashPassword } from "../lib/password";
import { MIN_PASSWORD_LENGTH } from "../lib/passwordPolicy";
import { audit, notify, toAuthUser, publicUser } from "../lib/users";
import { MANDATORY_DOCUMENTS } from "./documents";

export const adminControlRouter = Router();

const ALL_ROLES = [
  "APPLICANT",
  "VERIFICATION",
  "ADMINISTRATOR",
  "JURY",
  "JURY_CHAIR",
  "OBSERVER",
] as const;

function userPublic(u: {
  id: string;
  email: string;
  fullName: string;
  mobile: string | null;
  designation: string | null;
  orgName: string | null;
  roles: Role[];
  mfaEnabled: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    mobile: u.mobile ?? "",
    designation: u.designation ?? "",
    orgName: u.orgName ?? "",
    roles: u.roles,
    mfaEnabled: u.mfaEnabled,
    active: u.active !== false,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

/* ── Users ─────────────────────────────────────────────── */

adminControlRouter.get(
  "/users",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req, res) => {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { roles: { has: role as Role } } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { fullName: { contains: q, mode: "insensitive" } },
                { orgName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    const sessions = await prisma.session.groupBy({
      by: ["userId"],
      _count: { id: true },
    });
    const sessionMap = Object.fromEntries(sessions.map((s) => [s.userId, s._count.id]));
    res.json({
      users: users.map((u) => ({ ...userPublic(u), activeSessions: sessionMap[u.id] ?? 0 })),
      roles: ALL_ROLES,
    });
  },
);

adminControlRouter.post(
  "/users",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(MIN_PASSWORD_LENGTH),
      mobile: z.string().optional(),
      designation: z.string().optional(),
      orgName: z.string().optional(),
      roles: z.array(z.enum(ALL_ROLES)).min(1),
      mfaEnabled: z.boolean().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const email = parsed.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        fullName: parsed.data.fullName,
        mobile: parsed.data.mobile,
        designation: parsed.data.designation,
        orgName: parsed.data.orgName,
        passwordHash,
        roles: parsed.data.roles,
        mfaEnabled: false,
        mfaSecret: null,
        active: parsed.data.active ?? true,
      },
    });
    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "USER_CREATED",
      afterJson: { id: user.id, email: user.email, roles: user.roles },
    });
    await notify(user.id, "Account created", "An administrator created your account.");
    res.status(201).json({ user: userPublic(user) });
  },
);

adminControlRouter.patch(
  "/users/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const schema = z.object({
      fullName: z.string().min(2).optional(),
      email: z.string().email().optional(),
      mobile: z.string().optional(),
      designation: z.string().optional(),
      orgName: z.string().optional(),
      roles: z.array(z.enum(ALL_ROLES)).min(1).optional(),
      mfaEnabled: z.boolean().optional(),
      active: z.boolean().optional(),
      password: z.string().min(MIN_PASSWORD_LENGTH).optional(),
      resetMfaSecret: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    if (parsed.data.email && parsed.data.email.toLowerCase() !== user.email) {
      const clash = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (clash) return res.status(409).json({ error: "Email already in use" });
    }

    // Prevent removing last admin
    if (parsed.data.roles && user.roles.includes("ADMINISTRATOR") && !parsed.data.roles.includes("ADMINISTRATOR")) {
      const admins = await prisma.user.count({
        where: { roles: { has: "ADMINISTRATOR" }, active: true, NOT: { id } },
      });
      if (admins === 0) return res.status(400).json({ error: "Cannot remove the last administrator" });
    }

    let passwordHash: string | undefined;
    if (parsed.data.password) passwordHash = await hashPassword(parsed.data.password);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email?.toLowerCase(),
        mobile: parsed.data.mobile,
        designation: parsed.data.designation,
        orgName: parsed.data.orgName,
        roles: parsed.data.roles,
        // Admin may only force-disable MFA; users enable via Google Authenticator QR in profile
        ...(parsed.data.mfaEnabled === false
          ? { mfaEnabled: false, mfaSecret: null }
          : {}),
        ...(parsed.data.resetMfaSecret
          ? { mfaEnabled: false, mfaSecret: null }
          : {}),
        active: parsed.data.active,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    if (passwordHash) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "USER_UPDATED",
      afterJson: {
        id,
        email: updated.email,
        roles: updated.roles,
        passwordReset: Boolean(passwordHash),
      },
      reason: parsed.data.password ? "Admin set password" : undefined,
    });
    res.json({ user: userPublic(updated) });
  },
);

adminControlRouter.post(
  "/users/:id/revoke-sessions",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const result = await prisma.session.deleteMany({ where: { userId: id } });
    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "USER_SESSIONS_REVOKED",
      afterJson: { id, count: result.count },
    });
    res.json({ ok: true, revoked: result.count });
  },
);

adminControlRouter.delete(
  "/users/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.id);
    if (id === req.user!.id) return res.status(400).json({ error: "Cannot delete your own account" });
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.roles.includes("ADMINISTRATOR")) {
      const admins = await prisma.user.count({
        where: { roles: { has: "ADMINISTRATOR" }, active: true, NOT: { id } },
      });
      if (admins === 0) return res.status(400).json({ error: "Cannot delete the last administrator" });
    }
    const apps = await prisma.application.count({ where: { applicantId: id } });
    if (apps > 0) {
      const deactivated = await prisma.user.update({
        where: { id },
        data: { active: false },
      });
      await prisma.session.deleteMany({ where: { userId: id } });
      await audit({
        actorId: req.user!.id,
        role: "ADMINISTRATOR",
        action: "USER_DEACTIVATED",
        afterJson: { id, reason: "Had applications" },
      });
      return res.json({
        ok: true,
        deactivated: true,
        message: "User had applications — deactivated instead of deleted",
        user: userPublic(deactivated),
      });
    }
    await prisma.user.delete({ where: { id } });
    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "USER_DELETED",
      afterJson: { id, email: user.email },
    });
    res.json({ ok: true, deleted: true });
  },
);

/* ── Settings ──────────────────────────────────────────── */

adminControlRouter.get(
  "/settings",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (_req, res) => {
    const rows = await prisma.siteSetting.findMany();
    const map: Record<string, unknown> = {
      nominationsOpen: true,
      registrationOpen: true,
    };
    for (const row of rows) map[row.key] = row.value;
    res.json({ settings: map });
  },
);

adminControlRouter.put(
  "/settings",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      nominationsOpen: z.boolean().optional(),
      registrationOpen: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue;
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "SETTINGS_UPDATED",
      afterJson: parsed.data,
    });
    const rows = await prisma.siteSetting.findMany();
    const map: Record<string, unknown> = { nominationsOpen: true, registrationOpen: true };
    for (const row of rows) map[row.key] = row.value;
    res.json({ settings: map });
  },
);

/* ── Inbox ─────────────────────────────────────────────── */

adminControlRouter.get(
  "/inbox",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION"),
  async (_req, res) => {
    const [enquiries, partnerships, helpTickets] = await Promise.all([
      prisma.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.partnershipRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.helpTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { user: { select: { fullName: true, email: true } } },
      }),
    ]);
    res.json({
      enquiries,
      partnerships,
      helpTickets: helpTickets.map((t) => ({
        ...t,
        userName: t.user.fullName,
        userEmail: t.user.email,
      })),
    });
  },
);

adminControlRouter.patch(
  "/inbox/enquiries/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "ARCHIVED"]).optional(),
      adminNote: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const item = await prisma.enquiry.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "ENQUIRY_UPDATED",
      afterJson: { id: item.id, status: item.status },
    });
    res.json({ item });
  },
);

adminControlRouter.patch(
  "/inbox/partnerships/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "ARCHIVED"]).optional(),
      adminNote: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const item = await prisma.partnershipRequest.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    res.json({ item });
  },
);

adminControlRouter.patch(
  "/inbox/help/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const item = await prisma.helpTicket.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    res.json({ item });
  },
);

adminControlRouter.delete(
  "/inbox/enquiries/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    await prisma.enquiry.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  },
);

adminControlRouter.delete(
  "/inbox/partnerships/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    await prisma.partnershipRequest.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  },
);

/* ── Document requirements ─────────────────────────────── */

adminControlRouter.get(
  "/document-requirements",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (_req, res) => {
    let items = await prisma.documentRequirement.findMany({ orderBy: { sortOrder: "asc" } });
    if (items.length === 0) {
      await prisma.documentRequirement.createMany({
        data: MANDATORY_DOCUMENTS.map((name, i) => ({
          name,
          evidenceType: name.includes("Financial") ? "Financial" : name.includes("Mysuru") ? "Operational" : "Statutory",
          mandatory: true,
          sortOrder: i,
          active: true,
        })),
      });
      items = await prisma.documentRequirement.findMany({ orderBy: { sortOrder: "asc" } });
    }
    res.json({ items });
  },
);

adminControlRouter.post(
  "/document-requirements",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      name: z.string().min(2),
      evidenceType: z.string().default("Statutory"),
      mandatory: z.boolean().default(true),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const count = await prisma.documentRequirement.count();
    const item = await prisma.documentRequirement.create({
      data: {
        ...parsed.data,
        sortOrder: parsed.data.sortOrder ?? count,
      },
    });
    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "DOC_REQUIREMENT_CREATED",
      afterJson: { id: item.id, name: item.name },
    });
    res.status(201).json({ item });
  },
);

adminControlRouter.patch(
  "/document-requirements/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      name: z.string().min(2).optional(),
      evidenceType: z.string().optional(),
      mandatory: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const item = await prisma.documentRequirement.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    });
    res.json({ item });
  },
);

adminControlRouter.delete(
  "/document-requirements/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    await prisma.documentRequirement.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  },
);

/* ── Application admin actions ─────────────────────────── */

adminControlRouter.post(
  "/applications/:id/status",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      status: z.enum([
        "DRAFT",
        "SUBMITTED",
        "ELIGIBILITY_REVIEW",
        "CLARIFICATION_REQUIRED",
        "VERIFICATION",
        "QUALIFIED",
        "READY_FOR_JURY",
        "NOT_QUALIFIED",
        "DISQUALIFIED",
        "JURY_EVALUATION",
        "MODERATION_REQUIRED",
        "FINALIST",
        "FINAL_ASSESSMENT",
        "RANKING_READY",
        "RESULT_LOCKED",
      ]),
      reason: z.string().min(3),
      rejectionReason: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const id = String(req.params.id);
    const app = await prisma.application.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
    });
    if (!app) return res.status(404).json({ error: "Application not found" });
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: {
        status: parsed.data.status,
        rejectionReason: parsed.data.rejectionReason,
      },
    });
    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "APPLICATION_STATUS_CHANGED",
      applicationId: app.applicationId,
      beforeJson: { status: app.status },
      afterJson: { status: updated.status },
      reason: parsed.data.reason,
    });
    await notify(
      app.applicantId,
      "Application status updated",
      `Your application ${app.applicationId} is now ${updated.status.replace(/_/g, " ")}.`,
    );
    res.json({ application: updated });
  },
);

adminControlRouter.post(
  "/applications/:id/reopen",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({ reason: z.string().min(5) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const id = String(req.params.id);
    const app = await prisma.application.findFirst({
      where: { OR: [{ id }, { applicationId: id }] },
    });
    if (!app) return res.status(404).json({ error: "Application not found" });
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: { status: "DRAFT", submittedAt: null },
    });
    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "APPLICATION_REOPENED",
      applicationId: app.applicationId,
      beforeJson: { status: app.status },
      afterJson: { status: "DRAFT" },
      reason: parsed.data.reason,
    });
    await notify(
      app.applicantId,
      "Application reopened",
      `Application ${app.applicationId} was reopened for edits by the secretariat.`,
    );
    res.json({ application: updated });
  },
);
