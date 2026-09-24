import { Router } from "express";
import { z } from "zod";
import { store } from "../lib/store";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth, requireRoles } from "../lib/auth";
import { appToApi } from "../lib/users";
import { juryPhotoUpload } from "../lib/upload";
import { persistUploadedFile, publicFilePath } from "../lib/storage";
import { MIN_PASSWORD_LENGTH } from "../lib/passwordPolicy";

export const adminRouter = Router();

adminRouter.get(
  "/stats",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION", "JURY_CHAIR", "OBSERVER"),
  async (_req, res) => {
    const apps = await prisma.application.findMany();
    const count = (s: string) => apps.filter((a) => a.status === s).length;
    const lockedScores = await prisma.evaluation.count({ where: { lockedAt: { not: null } } });
    res.json({
      total: apps.length,
      submitted: apps.filter((a) => a.status !== "DRAFT").length,
      eligibilityPending: count("ELIGIBILITY_REVIEW"),
      clarificationsPending: count("CLARIFICATION_REQUIRED"),
      verified: count("VERIFICATION") + count("QUALIFIED"),
      qualified: count("QUALIFIED") + count("READY_FOR_JURY"),
      readyForJury: count("READY_FOR_JURY"),
      underEvaluation: count("JURY_EVALUATION"),
      moderationRequired: count("MODERATION_REQUIRED"),
      finalists: count("FINALIST") + count("FINAL_ASSESSMENT"),
      notQualified: count("NOT_QUALIFIED"),
      analytics: {
        byCategory: "Live from Neon",
        bySector: "From applications",
        msmeClass: "From profiles",
        evaluatorWorkload: `${lockedScores} locked scores`,
      },
    });
  },
);

adminRouter.get("/audit", requireAuth, requireRoles("ADMINISTRATOR", "OBSERVER", "JURY_CHAIR"), async (_req, res) => {
  const events = await prisma.auditEvent.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
  });
  res.json({
    events: events.map((e) => ({
      id: e.id,
      at: e.createdAt.toISOString(),
      userId: e.actorId,
      role: e.role,
      action: e.action,
      applicationId: e.applicationId,
      reason: e.reason,
    })),
  });
});

adminRouter.get(
  "/applications",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION", "OBSERVER"),
  async (_req, res) => {
    const apps = await prisma.application.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ applications: apps.map(appToApi) });
  },
);

adminRouter.post(
  "/tie-break",
  requireAuth,
  requireRoles("ADMINISTRATOR", "JURY_CHAIR"),
  (req: AuthRequest, res) => {
    if (store.resultLock.locked) return res.status(423).json({ error: "Results locked" });
    const schema = z.object({
      category: z.string(),
      applicationIds: z.tuple([z.string(), z.string()]),
      winnerId: z.string(),
      method: z.enum([
        "Higher Evidence Strength",
        "Higher category/business impact score",
        "Higher independent jury median",
        "Grand Jury deliberation",
        "Jury Chair deciding vote",
      ]),
      reason: z.string().min(5),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const row = {
      id: store.id(),
      ...parsed.data,
      recordedBy: req.user!.fullName,
      at: store.now(),
    };
    store.tieBreaks.unshift(row);
    store.audit({
      userId: req.user!.id,
      userName: req.user!.fullName,
      role: req.user!.roles[0],
      action: "TIE_BREAK_RECORDED",
      after: row,
      reason: parsed.data.reason,
    });
    res.status(201).json({ tieBreak: row });
  },
);

adminRouter.get("/tie-breaks", requireAuth, requireRoles("ADMINISTRATOR", "JURY_CHAIR", "OBSERVER"), (_req, res) => {
  res.json({ tieBreaks: store.tieBreaks });
});

adminRouter.post(
  "/result-lock",
  requireAuth,
  requireRoles("ADMINISTRATOR", "JURY_CHAIR"),
  (req: AuthRequest, res) => {
    const schema = z.object({
      authRole: z.enum(["ADMINISTRATOR", "JURY_CHAIR"]),
      checklistComplete: z.literal(true),
      demoDualAsAdmin: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const lock = store.resultLock;
    if (parsed.data.authRole === "ADMINISTRATOR") {
      if (!req.user!.roles.includes("ADMINISTRATOR")) {
        return res.status(403).json({ error: "Admin role required" });
      }
      lock.authAdminId = req.user!.id;
    }
    if (parsed.data.authRole === "JURY_CHAIR") {
      const ok =
        req.user!.roles.includes("JURY_CHAIR") ||
        (parsed.data.demoDualAsAdmin && req.user!.roles.includes("ADMINISTRATOR"));
      if (!ok) return res.status(403).json({ error: "Jury Chair role required" });
      lock.authChairId = req.user!.id;
    }

    // Dual control: need both (or admin acting twice with chair token in demo — require both ids)
    const adminOk = Boolean(lock.authAdminId);
    const chairOk = Boolean(lock.authChairId);
    if (adminOk && chairOk) {
      lock.locked = true;
      lock.lockedAt = store.now();
      store.applications.forEach((a) => {
        if (["FINALIST", "FINAL_ASSESSMENT", "RANKING_READY", "JURY_EVALUATION"].includes(a.status)) {
          a.status = "RESULT_LOCKED";
        }
      });
      store.audit({
        userId: req.user!.id,
        userName: req.user!.fullName,
        role: req.user!.roles[0],
        action: "RESULTS_LOCKED",
        after: { lockedAt: lock.lockedAt },
      });
    } else {
      store.audit({
        userId: req.user!.id,
        userName: req.user!.fullName,
        role: req.user!.roles[0],
        action: "RESULT_LOCK_PARTIAL_AUTH",
        after: { adminOk, chairOk },
      });
    }
    store.setResultLock({ ...lock });
    res.json({ resultLock: store.resultLock });
  },
);

adminRouter.get("/result-lock", requireAuth, requireRoles("ADMINISTRATOR", "JURY_CHAIR", "OBSERVER"), (_req, res) => {
  res.json({ resultLock: store.resultLock });
});

adminRouter.get(
  "/ceremony-export",
  requireAuth,
  requireRoles("ADMINISTRATOR", "JURY_CHAIR"),
  (_req, res) => {
    if (!store.resultLock.locked) {
      return res.status(400).json({ error: "Lock results before ceremony export" });
    }
    const sequence = store.resultLock.categoryResults.flatMap((cat) =>
      [...cat.ranks].reverse().map((r) => ({
        category: cat.category,
        role: r.role,
        name: r.org,
        applicationId: r.applicationId,
        score: r.finalScore,
      })),
    );
    res.json({
      lockedAt: store.resultLock.lockedAt,
      sequence,
      feeds: ["LED graphics", "presenter cards", "certificates", "website announcements"],
    });
  },
);

adminRouter.post(
  "/moderation/:applicationId",
  requireAuth,
  requireRoles("JURY_CHAIR", "ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.applicationId);
    const app = await prisma.application.findFirst({
      where: { OR: [{ applicationId: id }, { id }] },
    });
    if (!app) return res.status(404).json({ error: "Not found" });
    const decision = String(req.body?.decision || "");
    const notes = String(req.body?.notes || "");
    const updated =
      decision.toLowerCase().includes("accept")
        ? await prisma.application.update({
            where: { id: app.id },
            data: { status: "JURY_EVALUATION" },
          })
        : app;
    await prisma.auditEvent.create({
      data: {
        actorId: req.user!.id,
        role: req.user!.roles[0],
        action: "MODERATION_DECISION",
        applicationId: app.applicationId,
        afterJson: { decision, notes },
      },
    });
    res.json({ application: appToApi(updated), aggregation: null });
  },
);

adminRouter.get(
  "/jury-users",
  requireAuth,
  requireRoles("ADMINISTRATOR", "JURY_CHAIR"),
  async (_req, res) => {
    const jury = await prisma.user.findMany({
      where: {
        active: true,
        OR: [{ roles: { has: "JURY" } }, { roles: { has: "JURY_CHAIR" } }],
      },
    });
    res.json({
      jury: jury.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roles: u.roles,
        categoryCodes: u.categoryCodes,
        expertise: u.expertise,
        affiliation: u.affiliation,
      })),
    });
  },
);

function juryProfilePublic(u: {
  id: string;
  fullName: string;
  email: string;
  mobile: string | null;
  designation: string | null;
  affiliation: string | null;
  expertise: string | null;
  bio: string | null;
  linkedin: string | null;
  website: string | null;
  notes: string | null;
  roles: string[];
  categoryCodes: string[];
  mfaEnabled: boolean;
  active: boolean;
  photoUrl?: string | null;
}) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    mobile: u.mobile ?? "",
    designation: u.designation ?? "",
    affiliation: u.affiliation ?? "",
    expertise: u.expertise ?? "",
    bio: u.bio ?? "",
    linkedin: u.linkedin ?? "",
    website: u.website ?? "",
    notes: u.notes ?? "",
    roles: u.roles,
    categoryCodes: u.categoryCodes ?? [],
    mfaEnabled: u.mfaEnabled,
    active: u.active !== false,
    photoUrl: u.photoUrl ?? "",
  };
}

const AWARD_CATEGORIES = [
  { code: "MOTY", title: "MSME of the Year" },
  { code: "MFG", title: "Manufacturing Excellence" },
  { code: "SRV", title: "Service Excellence" },
  { code: "EMG", title: "Emerging MSME" },
  { code: "INN", title: "Innovation & Technology" },
  { code: "GRW", title: "Growth Excellence" },
  { code: "WEN", title: "Women Entrepreneur" },
  { code: "YEN", title: "Young Entrepreneur" },
  { code: "SSI", title: "Sustainability & Social Impact" },
  { code: "EMP", title: "Employer of the Year" },
];

adminRouter.get(
  "/jury-profiles",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (_req, res) => {
    const profiles = await prisma.user.findMany({
      where: {
        OR: [{ roles: { has: "JURY" } }, { roles: { has: "JURY_CHAIR" } }],
      },
      orderBy: { fullName: "asc" },
    });
    res.json({
      profiles: profiles.map(juryProfilePublic),
      categories: AWARD_CATEGORIES,
    });
  },
);

adminRouter.post(
  "/jury-profiles",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(MIN_PASSWORD_LENGTH),
      mobile: z.string().optional(),
      designation: z.string().optional(),
      affiliation: z.string().optional(),
      expertise: z.string().optional(),
      bio: z.string().optional(),
      linkedin: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      categoryCodes: z.array(z.string()).default([]),
      isChair: z.boolean().optional(),
      mfaEnabled: z.boolean().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const exists = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const { hashPassword } = await import("../lib/password");
    const passwordHash = await hashPassword(parsed.data.password);
    const roles = parsed.data.isChair
      ? (["JURY_CHAIR", "JURY"] as const)
      : (["JURY"] as const);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        mobile: parsed.data.mobile,
        fullName: parsed.data.fullName,
        designation: parsed.data.designation || "Jury Member",
        passwordHash,
        roles: [...roles],
        mfaEnabled: false,
        mfaSecret: null,
        categoryCodes: parsed.data.categoryCodes,
        expertise: parsed.data.expertise,
        affiliation: parsed.data.affiliation,
        bio: parsed.data.bio,
        linkedin: parsed.data.linkedin,
        website: parsed.data.website,
        notes: parsed.data.notes,
        active: parsed.data.active ?? true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: req.user!.id,
        role: "ADMINISTRATOR",
        action: "JURY_PROFILE_CREATED",
        afterJson: { id: user.id, email: user.email, categoryCodes: user.categoryCodes },
      },
    });
    res.status(201).json({ profile: juryProfilePublic(user) });
  },
);

adminRouter.post(
  "/jury-profiles/:id/photo",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  (req: AuthRequest, res) => {
    juryPhotoUpload.single("photo")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });
      const id = String(req.params.id);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user || (!user.roles.includes("JURY") && !user.roles.includes("JURY_CHAIR"))) {
        return res.status(404).json({ error: "Jury profile not found" });
      }
      if (!req.file) return res.status(400).json({ error: "Photo file required" });
      const photoUrl = publicFilePath("jury", req.file.filename);
      await persistUploadedFile({
        kind: "jury",
        filename: req.file.filename,
        absolutePath: req.file.path,
        contentType: req.file.mimetype,
      });
      const updated = await prisma.user.update({
        where: { id },
        data: { photoUrl },
      });
      await prisma.auditEvent.create({
        data: {
          actorId: req.user!.id,
          role: "ADMINISTRATOR",
          action: "JURY_PHOTO_UPDATED",
          afterJson: { id, photoUrl },
        },
      });
      res.json({ profile: juryProfilePublic(updated), photoUrl });
    });
  },
);

adminRouter.patch(
  "/jury-profiles/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || (!user.roles.includes("JURY") && !user.roles.includes("JURY_CHAIR"))) {
      return res.status(404).json({ error: "Jury profile not found" });
    }
    const schema = z.object({
      fullName: z.string().min(2).optional(),
      email: z.string().email().optional(),
      password: z.string().min(MIN_PASSWORD_LENGTH).optional(),
      mobile: z.string().optional(),
      designation: z.string().optional(),
      affiliation: z.string().optional(),
      expertise: z.string().optional(),
      bio: z.string().optional(),
      linkedin: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      categoryCodes: z.array(z.string()).optional(),
      isChair: z.boolean().optional(),
      mfaEnabled: z.boolean().optional(),
      active: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    if (parsed.data.email && parsed.data.email.toLowerCase() !== user.email.toLowerCase()) {
      const clash = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (clash) return res.status(409).json({ error: "Email already in use" });
    }

    let roles = [...user.roles];
    if (parsed.data.isChair === true) {
      roles = Array.from(new Set([...roles, "JURY", "JURY_CHAIR"])) as typeof roles;
    }
    if (parsed.data.isChair === false) {
      roles = roles.filter((r) => r !== "JURY_CHAIR");
      if (!roles.includes("JURY")) roles.push("JURY");
    }

    let passwordHash: string | undefined;
    if (parsed.data.password) {
      const { hashPassword } = await import("../lib/password");
      passwordHash = await hashPassword(parsed.data.password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email?.toLowerCase(),
        mobile: parsed.data.mobile,
        designation: parsed.data.designation,
        affiliation: parsed.data.affiliation,
        expertise: parsed.data.expertise,
        bio: parsed.data.bio,
        linkedin: parsed.data.linkedin,
        website: parsed.data.website,
        notes: parsed.data.notes,
        categoryCodes: parsed.data.categoryCodes,
        // Admin force-disable only; users enroll Google Authenticator themselves
        ...(parsed.data.mfaEnabled === false
          ? { mfaEnabled: false, mfaSecret: null }
          : {}),
        active: parsed.data.active,
        roles,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorId: req.user!.id,
        role: "ADMINISTRATOR",
        action: "JURY_PROFILE_UPDATED",
        afterJson: { id: updated.id, email: updated.email },
      },
    });
    res.json({ profile: juryProfilePublic(updated) });
  },
);

adminRouter.delete(
  "/jury-profiles/:id",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "Jury profile not found" });
    if (!user.roles.includes("JURY") && !user.roles.includes("JURY_CHAIR")) {
      return res.status(400).json({ error: "Not a jury profile" });
    }
    const assigned = await prisma.application.count({
      where: { assignedJuryIds: { has: user.id } },
    });
    if (assigned > 0) {
      const deactivated = await prisma.user.update({
        where: { id },
        data: { active: false },
      });
      await prisma.auditEvent.create({
        data: {
          actorId: req.user!.id,
          role: "ADMINISTRATOR",
          action: "JURY_PROFILE_DEACTIVATED",
          afterJson: { id: user.id },
        },
      });
      return res.json({
        ok: true,
        deactivated: true,
        message: "Juror had assignments — profile deactivated instead of deleted",
        profile: juryProfilePublic(deactivated),
      });
    }
    await prisma.user.delete({ where: { id } });
    await prisma.auditEvent.create({
      data: {
        actorId: req.user!.id,
        role: "ADMINISTRATOR",
        action: "JURY_PROFILE_DELETED",
        afterJson: { id: user.id, email: user.email },
      },
    });
    res.json({ ok: true, deleted: true });
  },
);

adminRouter.get(
  "/rankings/:categoryCode",
  requireAuth,
  requireRoles("ADMINISTRATOR", "JURY_CHAIR", "OBSERVER"),
  async (req, res) => {
    const code = String(req.params.categoryCode).toUpperCase();
    const fromLock = store.resultLock.categoryResults.find((c) =>
      c.category.toUpperCase().includes(code === "MFG" ? "MANUFACTURING" : code),
    );
    if (fromLock) {
      return res.json({ category: fromLock.category, ranks: fromLock.ranks });
    }
    const apps = await prisma.application.findMany({
      where: { categoryCode: code, status: { not: "DRAFT" } },
      orderBy: { progress: "desc" },
      take: 5,
    });
    res.json({
      category: code,
      ranks: apps.map((a, i) => ({
        rank: i + 1,
        applicationId: a.applicationId,
        org: a.organisationName,
        finalScore: a.progress,
        role: i === 0 ? "Leading" : "Contender",
      })),
    });
  },
);

adminRouter.post(
  "/observer-attestation",
  requireAuth,
  requireRoles("OBSERVER"),
  async (req: AuthRequest, res) => {
    const checks = req.body?.checks;
    if (!Array.isArray(checks) || checks.length < 6) {
      return res.status(400).json({ error: "Complete all integrity checks" });
    }
    const event = await prisma.auditEvent.create({
      data: {
        actorId: req.user!.id,
        role: "OBSERVER",
        action: "OBSERVER_ATTESTATION",
        afterJson: { checks, note: req.body?.note },
      },
    });
    res.status(201).json({ attestation: event });
  },
);
