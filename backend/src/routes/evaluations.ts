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
    if (k === "step" || k === "savedAt" || k === "answers") continue;
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

/** Flat applicant form answers live under draftJson.answers */
function flatAnswers(draft: Record<string, unknown>): Record<string, string> {
  const nested = asRecord(draft.answers);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(nested)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s) out[k] = s;
  }
  return out;
}

function fieldsFromKeys(
  answers: Record<string, string>,
  pairs: [string, string][],
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [key, label] of pairs) {
    const v = answers[key];
    if (v) out.push({ label, value: v });
  }
  return out;
}

/** Build jury dossier sections from flat answers (+ legacy nested draft shape). */
function buildDossierFromDraft(
  draft: Record<string, unknown>,
  categoryCriteriaNames: string[] = [],
): {
  overview: { label: string; value: string }[];
  performance: { label: string; value: string }[];
  category: { label: string; value: string }[];
  mysuru: { label: string; value: string }[];
  signature: { label: string; value: string }[];
  eligibility: { label: string; value: string }[];
  declaration: { label: string; value: string }[];
} {
  const answers = flatAnswers(draft);
  const overviewNested = flattenFields(asRecord(draft.overview));
  const performanceNested = flattenFields(asRecord(draft.performance));
  const categoryNested = flattenFields(asRecord(draft.category));
  const mysuruNested = flattenFields(asRecord(draft.mysuru));
  const signatureNested = flattenFields(asRecord(draft.signature));

  const eligibility: { label: string; value: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const v = answers[`eligibility_${i}`];
    if (!v) continue;
    eligibility.push({ label: `Eligibility ${i + 1}`, value: v });
    const reason = answers[`eligibility_${i}_reason`];
    if (reason) eligibility.push({ label: `Eligibility ${i + 1} reason`, value: reason });
  }

  const overview =
    overviewNested.length > 0
      ? overviewNested
      : fieldsFromKeys(answers, [
          ["overview_describe", "Describe your business"],
          ["overview_products", "Principal products or services"],
          ["overview_customers", "Principal customers or markets"],
          ["overview_differentiates", "What differentiates your organisation?"],
          ["overview_achievements", "Three most important achievements"],
        ]);

  const performance =
    performanceNested.length > 0
      ? performanceNested
      : (() => {
          const rows: { label: string; value: string }[] = [];
          const metrics = [
            "Revenue (₹)",
            "Profit / EBITDA (₹)",
            "Employees",
            "Customers / Clients",
            "Locations / Markets",
          ];
          for (let mi = 0; mi < metrics.length; mi++) {
            for (let yi = 0; yi < 3; yi++) {
              const key = `perf_m${mi}_y${yi}`;
              if (answers[key]) rows.push({ label: `${metrics[mi]} · FY-${3 - yi}`, value: answers[key] });
            }
          }
          rows.push(
            ...fieldsFromKeys(answers, [
              ["perf_investment", "Major investment"],
              ["perf_markets", "New markets entered"],
              ["perf_capacity", "Capacity expansion"],
              ["perf_products", "New products / services"],
              ["perf_export", "Export contribution"],
            ]),
          );
          return rows;
        })();

  const category =
    categoryNested.length > 0
      ? categoryNested
      : (() => {
          const rows: { label: string; value: string }[] = [];
          for (let i = 0; i < 12; i++) {
            const v = answers[`category_q_${i}`];
            if (!v) continue;
            rows.push({
              label: categoryCriteriaNames[i] || `Category question ${i + 1}`,
              value: v,
            });
          }
          return rows;
        })();

  const mysuru =
    mysuruNested.length > 0
      ? mysuruNested
      : fieldsFromKeys(answers, [
          ["mysuru_contribution", "Contribution to Mysuru"],
          ["mysuru_employees", "Employees based in Mysuru"],
          ["mysuru_vendors", "Local vendors / suppliers"],
          ["mysuru_sourcing", "Local sourcing"],
          ["mysuru_employment", "Local employment initiatives"],
          ["mysuru_community", "Community contribution"],
          ["mysuru_ecosystem", "Mysuru business ecosystem"],
        ]);
  if (!mysuru.length && draft.mysuruContribution) {
    mysuru.push({ label: "Contribution", value: String(draft.mysuruContribution) });
  }

  const signature =
    signatureNested.length > 0
      ? signatureNested
      : fieldsFromKeys(answers, [
          ["signature_achievement", "Achievement"],
          ["signature_why", "Why it matters"],
        ]);
  if (!signature.length && draft.signatureAchievement) {
    signature.push({ label: "Achievement", value: String(draft.signatureAchievement) });
  }

  const declaration = fieldsFromKeys(answers, [
    ["decl_signatory", "Authorized Signatory"],
    ["decl_designation", "Designation"],
    ["decl_place", "Place"],
    ["decl_date", "Date & time"],
    ["decl_agree", "Declaration agreement"],
  ]);

  return { overview, performance, category, mysuru, signature, eligibility, declaration };
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

    // Criteria labels for category_q_* (frontend awards content mirrored lightly)
    const criteriaByCode: Record<string, string[]> = {
      MFG: [
        "Manufacturing Performance & Productivity",
        "Quality Management",
        "Process Innovation & Automation",
        "Operational Efficiency",
        "Safety & Compliance",
        "Sustainable Manufacturing",
        "Workforce Development",
        "Growth & Market Performance",
      ],
      SRV: [
        "Service Delivery Excellence",
        "Customer Experience & Satisfaction",
        "Operational Reliability",
        "Process & Digital Enablement",
        "People Capability",
        "Growth & Market Reach",
        "Compliance & Governance",
      ],
      EMG: [
        "Traction & Growth Momentum",
        "Differentiation & Value Proposition",
        "Scalability & Operating Model",
        "Innovation / Technology Adoption",
        "Team & Leadership",
        "Market Opportunity",
        "Governance Basics",
      ],
      INN: [
        "Innovation Impact",
        "Technology Adoption / Build",
        "Business Value Created",
        "Scalability of Innovation",
        "Capability & Talent",
        "Risk, Security & Governance",
      ],
      GRW: [
        "Revenue & Profitability Growth",
        "Market Expansion",
        "Employment & Capability Growth",
        "Investment & Capacity Building",
        "Sustainability of Growth",
        "Governance & Risk Discipline",
      ],
      WEN: [
        "Entrepreneurial Leadership",
        "Business Performance",
        "Innovation / Differentiation",
        "People & Ecosystem Impact",
        "Resilience & Governance",
        "Contribution to Mysuru",
      ],
      YEN: [
        "Entrepreneurial Achievement",
        "Business Traction",
        "Innovation & Ambition",
        "Leadership Maturity",
        "Scalability Potential",
        "Mysuru Contribution",
      ],
      SSI: [
        "Impact Clarity & Measurement",
        "Environmental / Social Outcomes",
        "Integration with Business Model",
        "Stakeholder Engagement",
        "Governance & Transparency",
        "Scalability / Continuity",
      ],
      EMP: [
        "Workplace Culture",
        "Learning & Development",
        "Employee Wellbeing & Safety",
        "Inclusion & Fair Practices",
        "Retention & Engagement",
        "People Governance",
      ],
    };

    const mapped = buildDossierFromDraft(draft, criteriaByCode[app.categoryCode] || []);

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
        key: "eligibility",
        label: "Eligibility",
        ready: mapped.eligibility.length > 0,
        fields: mapped.eligibility,
      },
      {
        key: "signature",
        label: "Signature Achievement",
        ready: mapped.signature.length > 0,
        fields: mapped.signature,
      },
      {
        key: "overview",
        label: "Business Overview",
        ready: mapped.overview.length > 0,
        fields: mapped.overview,
      },
      {
        key: "performance",
        label: "Performance Data",
        ready: mapped.performance.length > 0,
        fields: mapped.performance,
      },
      {
        key: "category",
        label: "Category Responses",
        ready: mapped.category.length > 0,
        fields: mapped.category,
      },
      {
        key: "mysuru",
        label: "Mysuru Contribution",
        ready: mapped.mysuru.length > 0,
        fields: mapped.mysuru,
      },
      {
        key: "declaration",
        label: "Declaration",
        ready: mapped.declaration.length > 0,
        fields: mapped.declaration,
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
        ready: app.adminDecision === "ACCEPTED" || app.adminDecision === "REJECTED",
        fields: [
          { label: "Decision", value: app.adminDecision || "—" },
          { label: "Verified by", value: app.verifiedBy || "—" },
          {
            label: "Verified at",
            value: app.verifiedAt ? app.verifiedAt.toISOString() : "—",
          },
          ...(app.rejectionReason
            ? [{ label: "Notes", value: app.rejectionReason }]
            : app.adminDecision === "ACCEPTED"
              ? [{ label: "Notes", value: "Accepted for jury evaluation" }]
              : [{ label: "Notes", value: "Pending admin decision" }]),
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
