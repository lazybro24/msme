import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth, requireRoles } from "../lib/auth";
import { appToApi, audit, notify } from "../lib/users";
import { getResultsLocked } from "./applications";

export const evaluationsRouter = Router();

const DEFAULT_DEADLINE_DAYS = Number(process.env.EVALUATION_DEADLINE_DAYS || 21);

async function findApp(ref: string) {
  return prisma.application.findFirst({
    where: { OR: [{ applicationId: ref }, { id: ref }] },
    include: { organisation: true },
  });
}

function canEvaluate(
  app: { status: string; adminDecision: string | null; assignedJuryIds: string[] },
  userId: string,
  isChair: boolean,
) {
  const visible = ["JURY_EVALUATION", "MODERATION_REQUIRED", "FINALIST", "FINAL_ASSESSMENT"];
  if (!visible.includes(app.status)) return false;
  if (app.adminDecision !== "ACCEPTED") return false;
  if (!isChair && !app.assignedJuryIds.includes(userId)) return false;
  return true;
}

function deadlineIso(app: { evaluationDeadline: Date | null; submittedAt: Date | null; verifiedAt: Date | null }) {
  if (app.evaluationDeadline) return app.evaluationDeadline.toISOString().slice(0, 10);
  const base = app.verifiedAt || app.submittedAt || new Date();
  const d = new Date(base);
  d.setDate(d.getDate() + DEFAULT_DEADLINE_DAYS);
  return d.toISOString().slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function flattenFields(
  obj: Record<string, unknown>,
  prefix = "",
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k === "step" || k === "savedAt") continue;
    const label = prefix ? `${prefix} · ${k}` : k;
    if (v == null || v === "") continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenFields(asRecord(v), label));
    } else if (Array.isArray(v)) {
      out.push({ label, value: v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ") });
    } else {
      out.push({ label, value: String(v) });
    }
  }
  return out;
}

async function aggregateScores(applicationCuid: string) {
  const list = await prisma.evaluation.findMany({
    where: { applicationId: applicationCuid, lockedAt: { not: null } },
  });
  if (!list.length) return null;
  const totals = list.map((e) => e.totalScore ?? 0).sort((a, b) => a - b);
  const avg = totals.reduce((s, n) => s + n, 0) / totals.length;
  const median =
    totals.length % 2
      ? totals[(totals.length - 1) / 2]
      : (totals[totals.length / 2 - 1] + totals[totals.length / 2]) / 2;
  const variance = Math.max(...totals) - Math.min(...totals);
  return {
    scores: list.map((e) => ({
      judge: e.juryName,
      juryUserId: e.juryUserId,
      score: e.totalScore,
      id: e.id,
      reopenPending: Boolean(e.reopenReason && !e.reopenApproved),
    })),
    average: Number(avg.toFixed(2)),
    median,
    highest: Math.max(...totals),
    lowest: Math.min(...totals),
    variance,
    moderationRequired: variance > 20,
  };
}

const scoreSchema = z.object({
  scores: z.array(
    z.object({
      name: z.string(),
      points: z.number(),
      score: z.number(),
      comment: z.string().optional(),
    }),
  ),
  totalScore: z.number().optional(),
  overall: z.string().optional(),
  strengths: z.string().optional(),
  concerns: z.string().optional(),
  recommendation: z.string().optional(),
});

evaluationsRouter.get("/mine", requireAuth, requireRoles("JURY", "JURY_CHAIR"), async (req: AuthRequest, res) => {
  const user = req.user!;
  const visibleStatuses = ["JURY_EVALUATION", "MODERATION_REQUIRED", "FINALIST", "FINAL_ASSESSMENT"] as const;

  const apps = await prisma.application.findMany({
    where: {
      status: { in: [...visibleStatuses] },
      adminDecision: "ACCEPTED",
      assignedJuryIds: { has: user.id },
      ...(user.categoryCodes?.length ? { categoryCode: { in: user.categoryCodes } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  const evals = await prisma.evaluation.findMany({
    where: {
      juryUserId: user.id,
      applicationId: { in: apps.map((a) => a.id) },
    },
  });
  const byApp = new Map(evals.map((e) => [e.applicationId, e]));

  let reopenRequests: {
    applicationId: string;
    organisationName: string | null;
    juryUserId: string;
    juryName: string | null;
    reason: string | null;
    requestedAt: string | null;
  }[] = [];

  if (user.roles.includes("JURY_CHAIR") || user.roles.includes("ADMINISTRATOR")) {
    const pending = await prisma.evaluation.findMany({
      where: {
        reopenReason: { not: null },
        OR: [{ reopenApproved: false }, { reopenApproved: null }],
        lockedAt: { not: null },
        applicationId: { in: apps.map((a) => a.id) },
      },
      include: { application: true },
      orderBy: { reopenAt: "desc" },
    });
    reopenRequests = pending.map((e) => ({
      applicationId: e.application.applicationId,
      organisationName: e.application.organisationName,
      juryUserId: e.juryUserId,
      juryName: e.juryName,
      reason: e.reopenReason,
      requestedAt: e.reopenAt?.toISOString() ?? null,
    }));
  }

  res.json({
    conductAccepted: Boolean(user.conductAcceptedAt),
    assignments: apps.map((a) => {
      const evalRow = byApp.get(a.id);
      return {
        id: a.applicationId,
        category: a.categoryTitle,
        categoryCode: a.categoryCode,
        categorySlug: a.categorySlug,
        organisationName: a.organisationName,
        sector: a.sector,
        status: evalRow?.lockedAt
          ? "Completed"
          : evalRow?.reopenReason && !evalRow.reopenApproved
            ? "Reopen Pending"
            : evalRow?.scoresJson
              ? "In Progress"
              : "Pending",
        deadline: deadlineIso(a),
        conflictCleared: Boolean(evalRow?.conflictCleared),
        scoreLocked: Boolean(evalRow?.lockedAt),
        myScore: evalRow?.lockedAt ? evalRow.totalScore : null,
        recommendation: evalRow?.lockedAt ? evalRow.recommendation ?? null : null,
        scoredAt: evalRow?.lockedAt?.toISOString() ?? null,
        hasDraft: Boolean(evalRow?.scoresJson && !evalRow.lockedAt),
      };
    }),
    reopenRequests,
  });
});

evaluationsRouter.get(
  "/:applicationId/dossier",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR", "ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const app = await findApp(String(req.params.applicationId));
    if (!app) return res.status(404).json({ error: "Not found" });
    const isChair =
      req.user!.roles.includes("JURY_CHAIR") || req.user!.roles.includes("ADMINISTRATOR");
    if (!canEvaluate(app, req.user!.id, isChair) && !req.user!.roles.includes("ADMINISTRATOR")) {
      return res.status(403).json({ error: "Not assigned or not released for evaluation" });
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: {
        applicationId_juryUserId: {
          applicationId: app.id,
          juryUserId: req.user!.id,
        },
      },
    });

    const org = app.organisation;
    const draft = asRecord(app.draftJson);
    const docs = await prisma.document.findMany({
      where: {
        OR: [
          { applicationId: app.id },
          { applicationId: app.applicationId },
          ...(org ? [{ organisationId: org.id }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const overview = asRecord(draft.overview);
    const signature = asRecord(draft.signature);
    const performance = asRecord(draft.performance);
    const category = asRecord(draft.category);
    const mysuru = asRecord(draft.mysuru);

    const dossierSections = [
      {
        key: "snapshot",
        label: "Business Snapshot",
        ready: Boolean(org?.legalName),
        fields: org
          ? [
              { label: "Legal name", value: org.legalName },
              { label: "Brand", value: org.brandName || "—" },
              { label: "Industry", value: org.industry || "—" },
              { label: "Activity", value: org.activity || "—" },
              { label: "Constitution", value: org.constitution || "—" },
              { label: "Established", value: org.established || "—" },
              { label: "Udyam", value: org.udyam || "—" },
              { label: "Classification", value: org.classification || "—" },
              { label: "Employees", value: org.employees || "—" },
              { label: "Locations", value: org.locations || "—" },
              { label: "Mysuru ops", value: org.mysuruAddress || "—" },
              { label: "Website", value: org.website || "—" },
            ]
          : [],
      },
      {
        key: "signature",
        label: "Signature Achievement",
        ready: flattenFields(signature).length > 0 || Boolean(draft.signatureAchievement),
        fields:
          flattenFields(signature).length > 0
            ? flattenFields(signature)
            : draft.signatureAchievement
              ? [{ label: "Achievement", value: String(draft.signatureAchievement) }]
              : [],
      },
      {
        key: "overview",
        label: "Business Overview",
        ready: flattenFields(overview).length > 0,
        fields: flattenFields(overview),
      },
      {
        key: "performance",
        label: "Performance Data",
        ready: flattenFields(performance).length > 0,
        fields: flattenFields(performance),
      },
      {
        key: "category",
        label: "Category Responses",
        ready: flattenFields(category).length > 0,
        fields: flattenFields(category),
      },
      {
        key: "mysuru",
        label: "Mysuru Contribution",
        ready: flattenFields(mysuru).length > 0 || Boolean(draft.mysuruContribution),
        fields:
          flattenFields(mysuru).length > 0
            ? flattenFields(mysuru)
            : draft.mysuruContribution
              ? [{ label: "Contribution", value: String(draft.mysuruContribution) }]
              : [],
      },
      {
        key: "evidence",
        label: "Supporting Evidence",
        ready: docs.length > 0,
        fields: docs.map((d) => ({
          label: d.name,
          value: [d.evidenceType, d.period, d.description, d.fileName ? `File: ${d.fileName}` : null]
            .filter(Boolean)
            .join(" · ") || "Document",
          fileUrl: d.fileUrl || undefined,
          fileName: d.fileName || undefined,
        })),
      },
      {
        key: "verification",
        label: "Verification Notes",
        ready: app.adminDecision === "ACCEPTED",
        fields: [
          { label: "Decision", value: app.adminDecision || "—" },
          { label: "Verified by", value: app.verifiedBy || "—" },
          {
            label: "Verified at",
            value: app.verifiedAt ? app.verifiedAt.toISOString() : "—",
          },
          ...(app.rejectionReason
            ? [{ label: "Notes", value: app.rejectionReason }]
            : [{ label: "Notes", value: "Accepted for jury evaluation" }]),
        ],
      },
    ];

    const aggregation =
      isChair || evaluation?.lockedAt ? await aggregateScores(app.id) : null;

    res.json({
      application: {
        ...appToApi(app),
        draftJson: draft,
        evaluationDeadline: deadlineIso(app),
        verifiedAt: app.verifiedAt?.toISOString() ?? null,
        verifiedBy: app.verifiedBy ?? null,
      },
      organisation: org
        ? {
            legalName: org.legalName,
            brandName: org.brandName,
            industry: org.industry,
            activity: org.activity,
            classification: org.classification,
            udyam: org.udyam,
            employees: org.employees,
            mysuruAddress: org.mysuruAddress,
            website: org.website,
            constitution: org.constitution,
            established: org.established,
            locations: org.locations,
          }
        : null,
      evaluation: evaluation
        ? {
            id: evaluation.id,
            lockedAt: evaluation.lockedAt?.toISOString() ?? null,
            totalScore: evaluation.totalScore,
            recommendation: evaluation.recommendation,
            overall: evaluation.overall,
            strengths: evaluation.strengths,
            concerns: evaluation.concerns,
            scores: evaluation.scoresJson,
            conflictCleared: evaluation.conflictCleared,
            reopenPending: Boolean(evaluation.reopenReason && !evaluation.reopenApproved),
          }
        : null,
      dossierSections,
      documents: docs.map((d) => ({
        id: d.id,
        name: d.name,
        evidenceType: d.evidenceType,
        period: d.period,
        description: d.description,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
      })),
      aggregation: isChair ? aggregation : evaluation?.lockedAt ? { average: aggregation?.average, count: aggregation?.scores.length } : null,
      conductAccepted: Boolean(req.user!.conductAcceptedAt),
    });
  },
);

evaluationsRouter.post(
  "/:applicationId/conflict",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    const app = await findApp(String(req.params.applicationId));
    if (!app) return res.status(404).json({ error: "Not found" });
    if (!app.assignedJuryIds.includes(req.user!.id)) {
      return res.status(403).json({ error: "Not assigned" });
    }
    const hasConflict = Boolean(req.body?.hasConflict);
    const note = String(req.body?.note || "");

    if (hasConflict) {
      await prisma.application.update({
        where: { id: app.id },
        data: {
          assignedJuryIds: app.assignedJuryIds.filter((id) => id !== req.user!.id),
        },
      });
      await prisma.evaluation.upsert({
        where: {
          applicationId_juryUserId: { applicationId: app.id, juryUserId: req.user!.id },
        },
        create: {
          applicationId: app.id,
          juryUserId: req.user!.id,
          juryName: req.user!.fullName,
          conflictCleared: false,
          conflictNote: note,
        },
        update: {
          conflictCleared: false,
          conflictNote: note,
        },
      });
      await audit({
        actorId: req.user!.id,
        role: "JURY",
        action: "CONFLICT_DECLARED",
        applicationId: app.applicationId,
        afterJson: { note },
      });
      const admins = await prisma.user.findMany({ where: { roles: { has: "ADMINISTRATOR" } } });
      await Promise.all(
        admins.map((a) =>
          notify(a.id, "Conflict declared", `${app.applicationId} · ${req.user!.fullName}`),
        ),
      );
    } else {
      await prisma.evaluation.upsert({
        where: {
          applicationId_juryUserId: { applicationId: app.id, juryUserId: req.user!.id },
        },
        create: {
          applicationId: app.id,
          juryUserId: req.user!.id,
          juryName: req.user!.fullName,
          conflictCleared: true,
        },
        update: { conflictCleared: true, conflictNote: null },
      });
      await audit({
        actorId: req.user!.id,
        role: "JURY",
        action: "CONFLICT_CLEARED",
        applicationId: app.applicationId,
      });
    }
    res.json({ ok: true, hasConflict });
  },
);

/** Save scorecard draft without locking */
evaluationsRouter.post(
  "/:applicationId/draft",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    if (getResultsLocked()) return res.status(423).json({ error: "Results locked" });
    if (!req.user!.conductAcceptedAt) {
      return res.status(403).json({ error: "Accept Code of Conduct before scoring" });
    }
    const app = await findApp(String(req.params.applicationId));
    if (!app) return res.status(404).json({ error: "Not found" });
    const isChair = req.user!.roles.includes("JURY_CHAIR");
    if (!canEvaluate(app, req.user!.id, isChair)) {
      return res.status(403).json({ error: "Not assigned or not released for evaluation" });
    }
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await prisma.evaluation.findUnique({
      where: {
        applicationId_juryUserId: { applicationId: app.id, juryUserId: req.user!.id },
      },
    });
    if (existing?.lockedAt && !existing.reopenApproved) {
      return res.status(400).json({ error: "Score locked — request reopen first" });
    }

    const total =
      parsed.data.totalScore ??
      parsed.data.scores.reduce((s, row) => s + (row.score || 0), 0);

    const row = await prisma.evaluation.upsert({
      where: {
        applicationId_juryUserId: { applicationId: app.id, juryUserId: req.user!.id },
      },
      create: {
        applicationId: app.id,
        juryUserId: req.user!.id,
        juryName: req.user!.fullName,
        scoresJson: parsed.data.scores,
        totalScore: Math.round(total),
        overall: parsed.data.overall,
        strengths: parsed.data.strengths,
        concerns: parsed.data.concerns,
        recommendation: parsed.data.recommendation,
        conflictCleared: true,
      },
      update: {
        scoresJson: parsed.data.scores,
        totalScore: Math.round(total),
        overall: parsed.data.overall,
        strengths: parsed.data.strengths,
        concerns: parsed.data.concerns,
        recommendation: parsed.data.recommendation,
        juryName: req.user!.fullName,
      },
    });

    await audit({
      actorId: req.user!.id,
      role: "JURY",
      action: "EVALUATION_DRAFT_SAVED",
      applicationId: app.applicationId,
    });

    res.json({ evaluation: row, message: "Draft saved" });
  },
);

evaluationsRouter.post(
  "/:applicationId",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    if (getResultsLocked()) return res.status(423).json({ error: "Results locked" });
    if (!req.user!.conductAcceptedAt) {
      return res.status(403).json({ error: "Accept Code of Conduct before scoring" });
    }
    const app = await findApp(String(req.params.applicationId));
    if (!app) return res.status(404).json({ error: "Not found" });
    const isChair = req.user!.roles.includes("JURY_CHAIR");
    if (!canEvaluate(app, req.user!.id, isChair)) {
      return res.status(403).json({ error: "Not assigned or not released for evaluation" });
    }

    const schema = scoreSchema.extend({
      confirmIndependent: z.literal(true),
      totalScore: z.number(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await prisma.evaluation.findUnique({
      where: {
        applicationId_juryUserId: { applicationId: app.id, juryUserId: req.user!.id },
      },
    });
    if (existing?.lockedAt && !existing.reopenApproved) {
      return res.status(400).json({ error: "Score locked — request reopen first" });
    }

    const row = await prisma.evaluation.upsert({
      where: {
        applicationId_juryUserId: { applicationId: app.id, juryUserId: req.user!.id },
      },
      create: {
        applicationId: app.id,
        juryUserId: req.user!.id,
        juryName: req.user!.fullName,
        scoresJson: parsed.data.scores,
        totalScore: Math.round(parsed.data.totalScore),
        overall: parsed.data.overall,
        strengths: parsed.data.strengths,
        concerns: parsed.data.concerns,
        recommendation: parsed.data.recommendation,
        lockedAt: new Date(),
        conflictCleared: true,
      },
      update: {
        scoresJson: parsed.data.scores,
        totalScore: Math.round(parsed.data.totalScore),
        overall: parsed.data.overall,
        strengths: parsed.data.strengths,
        concerns: parsed.data.concerns,
        recommendation: parsed.data.recommendation,
        lockedAt: new Date(),
        reopenReason: null,
        reopenAt: null,
        reopenApproved: null,
        juryName: req.user!.fullName,
      },
    });

    await audit({
      actorId: req.user!.id,
      role: "JURY",
      action: "EVALUATION_SUBMITTED",
      applicationId: app.applicationId,
      afterJson: { totalScore: row.totalScore },
    });

    const agg = await aggregateScores(app.id);
    if (agg?.moderationRequired) {
      await prisma.application.update({
        where: { id: app.id },
        data: { status: "MODERATION_REQUIRED" },
      });
      await audit({
        role: "SYSTEM",
        action: "VARIANCE_MODERATION_REQUIRED",
        applicationId: app.applicationId,
        afterJson: agg,
      });
    }

    res.json({ evaluation: row, aggregation: agg });
  },
);

evaluationsRouter.post(
  "/:applicationId/reopen",
  requireAuth,
  requireRoles("JURY", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    const app = await findApp(String(req.params.applicationId));
    if (!app) return res.status(404).json({ error: "Not found" });
    const row = await prisma.evaluation.findUnique({
      where: {
        applicationId_juryUserId: { applicationId: app.id, juryUserId: req.user!.id },
      },
    });
    if (!row?.lockedAt) return res.status(400).json({ error: "No locked score" });
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 5) return res.status(400).json({ error: "Reason required" });

    const updated = await prisma.evaluation.update({
      where: { id: row.id },
      data: {
        reopenReason: reason,
        reopenAt: new Date(),
        reopenApproved: false,
      },
    });
    await audit({
      actorId: req.user!.id,
      role: "JURY",
      action: "SCORE_REOPEN_REQUESTED",
      applicationId: app.applicationId,
      reason,
    });
    const chairs = await prisma.user.findMany({
      where: {
        OR: [{ roles: { has: "ADMINISTRATOR" } }, { roles: { has: "JURY_CHAIR" } }],
      },
    });
    await Promise.all(
      chairs.map((a) =>
        notify(a.id, "Score reopen request", `${app.applicationId} — ${reason}`),
      ),
    );
    res.json({ evaluation: updated });
  },
);

evaluationsRouter.post(
  "/:applicationId/reopen/approve",
  requireAuth,
  requireRoles("ADMINISTRATOR", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    const app = await findApp(String(req.params.applicationId));
    if (!app) return res.status(404).json({ error: "Not found" });
    const juryUserId = String(req.body?.juryUserId || "");
    const row = await prisma.evaluation.findUnique({
      where: {
        applicationId_juryUserId: { applicationId: app.id, juryUserId },
      },
    });
    if (!row?.reopenReason) return res.status(404).json({ error: "No reopen request" });

    const updated = await prisma.evaluation.update({
      where: { id: row.id },
      data: {
        reopenApproved: true,
        lockedAt: null,
      },
    });
    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "SCORE_REOPEN_APPROVED",
      applicationId: app.applicationId,
      afterJson: { juryUserId },
    });
    await notify(juryUserId, "Reopen approved", `${app.applicationId} can be re-scored.`);
    res.json({ evaluation: updated });
  },
);

evaluationsRouter.get(
  "/:applicationId/aggregation",
  requireAuth,
  requireRoles("ADMINISTRATOR", "JURY_CHAIR", "VERIFICATION", "OBSERVER"),
  async (req, res) => {
    const app = await findApp(String(req.params.applicationId));
    if (!app) return res.status(404).json({ error: "Not found" });
    const agg = await aggregateScores(app.id);
    res.json({ aggregation: agg });
  },
);
