import { Router } from "express";
import { z } from "zod";
import type { ApplicationStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth, requireRoles } from "../lib/auth";
import {
  appToApi,
  audit,
  isProfileComplete,
  nextApplicationId,
  notify,
  orgToProfile,
} from "../lib/users";

export const applicationsRouter = Router();

/** Shared nomination answers — everything except category scorecard questions. */
function pickSharedAnswers(answers: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(answers).filter(([k]) => !k.startsWith("category_q_")),
  );
}

function answerFilled(answers: Record<string, unknown>, key: string) {
  return String(answers[key] ?? "").trim().length > 0;
}

/**
 * Rough progress mirror of the frontend nomination completeness helper.
 * Common/shared ≈ 45%; category scorecard ≈ 25%; trailing wrap-up ≈ 30%.
 */
function computeDraftProgress(
  answers: Record<string, unknown>,
  step: number,
  categoryQuestionCount = 6,
): number {
  let common = 0;
  let eligDone = 0;
  for (let i = 0; i < 4; i++) {
    const v = String(answers[`eligibility_${i}`] ?? "").trim().toLowerCase();
    if (v === "yes" || (v === "no" && answerFilled(answers, `eligibility_${i}_reason`))) {
      eligDone += 1;
    }
  }
  common += (eligDone / 4) * 12;
  if (answerFilled(answers, "overview_describe")) common += 16;
  if (answerFilled(answers, "perf_m0_y2")) common += 17;
  common = Math.min(45, common);

  const n = Math.max(1, categoryQuestionCount);
  let catDone = 0;
  for (let i = 0; i < n; i++) {
    if (answerFilled(answers, `category_q_${i}`)) catDone += 1;
  }
  const scorecard = (catDone / n) * 25;

  let trailing = 0;
  if (answerFilled(answers, "mysuru_contribution")) trailing += 8;
  if (answerFilled(answers, "signature_achievement")) trailing += 8;
  if (
    answerFilled(answers, "decl_signatory") &&
    String(answers.decl_agree ?? "").trim().toLowerCase() === "yes"
  ) {
    trailing += 10;
  }
  if (step >= 8) trailing += 2;
  if (step >= 10) trailing += 2;
  trailing = Math.min(30, trailing);

  return Math.min(100, Math.round(common + scorecard + trailing));
}

async function siblingSharedDraftSeed(applicantId: string): Promise<Prisma.InputJsonValue | null> {
  const siblings = await prisma.application.findMany({
    where: { applicantId, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
  });
  for (const sib of siblings) {
    const draft =
      sib.draftJson && typeof sib.draftJson === "object" && !Array.isArray(sib.draftJson)
        ? (sib.draftJson as {
            step?: number;
            answers?: Record<string, unknown>;
            documents?: unknown;
            savedAt?: string;
          })
        : null;
    if (!draft?.answers || !Object.keys(draft.answers).length) continue;
    const shared = pickSharedAnswers(draft.answers);
    if (!Object.keys(shared).length) continue;
    return {
      step: typeof draft.step === "number" ? Math.min(draft.step, 4) : 1,
      answers: shared as Prisma.InputJsonValue,
      documents: (draft.documents ?? null) as Prisma.InputJsonValue,
      savedAt: draft.savedAt ?? new Date().toISOString(),
      seededFromSibling: true,
    };
  }
  return null;
}

type DraftShape = {
  step?: number;
  answers?: Record<string, unknown>;
  documents?: unknown;
  savedAt?: string;
};

function parseDraft(raw: unknown): DraftShape {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as DraftShape;
  return {};
}

/** Push shared (non-scorecard) answers from one app onto other DRAFT siblings. */
async function syncSharedAnswersToDraftSiblings(
  applicantId: string,
  sourceAppId: string,
  draft: DraftShape,
) {
  const sharedAnswers = pickSharedAnswers(draft.answers || {});
  if (!Object.keys(sharedAnswers).length) return;

  const siblings = await prisma.application.findMany({
    where: {
      applicantId,
      status: "DRAFT",
      NOT: { id: sourceAppId },
    },
  });

  for (const sib of siblings) {
    const prev = parseDraft(sib.draftJson);
    const categoryOnly = Object.fromEntries(
      Object.entries(prev.answers || {}).filter(([k]) => k.startsWith("category_q_")),
    );
    const nextAnswers = { ...sharedAnswers, ...categoryOnly };
    const nextStep =
      typeof prev.step === "number" && prev.step >= 5
        ? prev.step
        : Math.max(5, typeof draft.step === "number" ? Math.min(draft.step, 5) : 5);
    const nextProgress = computeDraftProgress(nextAnswers, nextStep);
    await prisma.application.update({
      where: { id: sib.id },
      data: {
        progress: Math.max(sib.progress, nextProgress),
        draftJson: {
          ...prev,
          step: nextStep,
          answers: nextAnswers as Prisma.InputJsonValue,
          documents: (draft.documents ?? prev.documents ?? null) as Prisma.InputJsonValue,
          savedAt: draft.savedAt ?? prev.savedAt ?? new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }
}

/** If a draft is missing shared answers, copy them from any sibling (incl. submitted). */
async function hydrateDraftFromSiblings(app: {
  id: string;
  applicantId: string;
  status: string;
  progress: number;
  draftJson: unknown;
}) {
  if (app.status !== "DRAFT") return app;
  const draft = parseDraft(app.draftJson);
  const answers = { ...(draft.answers || {}) };

  const siblings = await prisma.application.findMany({
    where: { applicantId: app.applicantId, NOT: { id: app.id } },
    orderBy: { updatedAt: "desc" },
  });

  let mergedShared: Record<string, unknown> = {};
  let docsFromSibling: unknown = draft.documents ?? null;
  for (const sib of siblings) {
    const sibDraft = parseDraft(sib.draftJson);
    const shared = pickSharedAnswers(sibDraft.answers || {});
    if (!Object.keys(shared).length) continue;
    // Fill only keys this draft is still missing — never overwrite local answers
    for (const [k, v] of Object.entries(shared)) {
      const cur = String(answers[k] ?? "").trim();
      const incoming = String(v ?? "").trim();
      if (!cur && incoming) mergedShared[k] = v;
    }
    if (docsFromSibling == null && sibDraft.documents != null) {
      docsFromSibling = sibDraft.documents;
    }
  }

  if (!Object.keys(mergedShared).length) return app;

  const categoryOnly = Object.fromEntries(
    Object.entries(answers).filter(([k]) => k.startsWith("category_q_")),
  );
  const existingShared = pickSharedAnswers(answers);
  const nextAnswers = { ...mergedShared, ...existingShared, ...categoryOnly };
  const sharedReady =
    String(nextAnswers.overview_describe ?? "").trim().length > 0 ||
    String(nextAnswers.decl_signatory ?? "").trim().length > 0;
  const nextStep =
    sharedReady && (typeof draft.step !== "number" || draft.step < 5)
      ? 5
      : typeof draft.step === "number"
        ? draft.step
        : 5;
  const nextProgress = computeDraftProgress(nextAnswers, nextStep);
  return prisma.application.update({
    where: { id: app.id },
    data: {
      progress: Math.max(app.progress, nextProgress),
      draftJson: {
        ...draft,
        step: nextStep,
        answers: nextAnswers as Prisma.InputJsonValue,
        documents: (docsFromSibling ?? null) as Prisma.InputJsonValue,
        savedAt: new Date().toISOString(),
        hydratedFromSibling: true,
      } as Prisma.InputJsonValue,
    },
  });
}

const STATUSES: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "ELIGIBILITY_REVIEW",
  "CLARIFICATION_REQUIRED",
  "VERIFICATION",
  "QUALIFIED",
  "READY_FOR_JURY",
  "NOT_QUALIFIED",
  "JURY_EVALUATION",
  "MODERATION_REQUIRED",
  "FINALIST",
  "FINAL_ASSESSMENT",
  "RANKING_READY",
  "RESULT_LOCKED",
];

let resultsLocked = false;

applicationsRouter.get("/workflow", (_req, res) => {
  res.json({
    statuses: STATUSES,
    scoring: { documentaryWeight: 0.7, finalistWeight: 0.3, finalistMin: 60, podiumMin: 70 },
  });
});

applicationsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  const where =
    user.roles.includes("APPLICANT") &&
    !user.roles.some((r) => ["ADMINISTRATOR", "VERIFICATION", "OBSERVER"].includes(r))
      ? { applicantId: user.id }
      : user.roles.includes("JURY") &&
          !user.roles.includes("JURY_CHAIR") &&
          !user.roles.includes("ADMINISTRATOR")
        ? { assignedJuryIds: { has: user.id } }
        : {};

  const list = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.json({
    applications: list.map((a) => ({
      ...appToApi(a),
      commercialHidden: user.roles.includes("JURY") && !user.roles.includes("ADMINISTRATOR"),
    })),
  });
});

applicationsRouter.get("/:applicationId", requireAuth, async (req: AuthRequest, res) => {
  const id = String(req.params.applicationId);
  let app = await prisma.application.findFirst({
    where: { OR: [{ applicationId: id }, { id }] },
  });
  if (!app) return res.status(404).json({ error: "Not found" });
  const user = req.user!;
  const isStaff = user.roles.some((r) =>
    ["ADMINISTRATOR", "VERIFICATION", "JURY_CHAIR", "OBSERVER"].includes(r),
  );
  const isOwner = app.applicantId === user.id;
  const isAssignedJury = app.assignedJuryIds.includes(user.id);
  if (!isStaff && !isOwner && !isAssignedJury) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (isOwner) {
    app = await hydrateDraftFromSiblings(app);
  }

  const payload: Record<string, unknown> = {
    application: appToApi(app),
    aggregation: null,
  };

  if (isStaff) {
    const org = await prisma.organisation.findUnique({ where: { ownerId: app.applicantId } });
    payload.organisation = orgToProfile(org);
  }

  res.json(payload);
});

applicationsRouter.post(
  "/batch",
  requireAuth,
  requireRoles("APPLICANT", "ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      categories: z
        .array(
          z.object({
            categoryCode: z.string().min(2),
            categorySlug: z.string().min(2),
            categoryTitle: z.string().min(2),
          }),
        )
        .min(1)
        .max(2),
      organisationName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const user = req.user!;

    if (user.roles.includes("APPLICANT") && !user.roles.includes("ADMINISTRATOR")) {
      const orgCheck = await prisma.organisation.findUnique({ where: { ownerId: user.id } });
      if (!isProfileComplete(orgCheck)) {
        return res.status(400).json({
          error: "Complete your business profile before choosing award categories",
        });
      }
    }

    const existingCount = await prisma.application.count({ where: { applicantId: user.id } });
    const remaining = 2 - existingCount;
    if (remaining <= 0) {
      return res.status(400).json({ error: "Maximum 2 category applications" });
    }
    if (parsed.data.categories.length > remaining) {
      return res.status(400).json({
        error: `You can add ${remaining} more categor${remaining === 1 ? "y" : "ies"} (max 2 total)`,
      });
    }

    const already = await prisma.application.findMany({
      where: { applicantId: user.id },
      select: { categoryCode: true },
    });
    const alreadyCodes = new Set(already.map((a) => a.categoryCode));

    const codes = parsed.data.categories.map((c) => c.categoryCode);
    if (new Set(codes).size !== codes.length) {
      return res.status(400).json({ error: "Duplicate categories in selection" });
    }
    if (codes.some((c) => alreadyCodes.has(c))) {
      return res.status(400).json({ error: "One or more categories are already selected" });
    }

    const org = await prisma.organisation.findUnique({ where: { ownerId: user.id } });
    const seedDraft = await siblingSharedDraftSeed(user.id);
    const created = [];
    for (const cat of parsed.data.categories) {
      const applicationId = await nextApplicationId(cat.categoryCode);
      const app = await prisma.application.create({
        data: {
          applicationId,
          categoryCode: cat.categoryCode,
          categorySlug: cat.categorySlug,
          categoryTitle: cat.categoryTitle,
          status: "DRAFT",
          progress: seedDraft
            ? computeDraftProgress(
                ((seedDraft as { answers?: Record<string, unknown> }).answers ||
                  {}) as Record<string, unknown>,
                ((seedDraft as { step?: number }).step || 5) as number,
              )
            : 5,
          applicantId: user.id,
          organisationId: org?.id,
          organisationName:
            parsed.data.organisationName || org?.legalName || user.orgName || "Organisation",
          sector: org?.industry || "General",
          msme: org?.classification || "Small",
          adminDecision: "PENDING",
          ...(seedDraft ? { draftJson: seedDraft } : {}),
        },
      });
      created.push(app);
      await audit({
        actorId: user.id,
        role: "APPLICANT",
        action: "APPLICATION_CREATED",
        applicationId,
      });
      await notify(
        user.id,
        "Category added",
        `${cat.categoryTitle} added to your nomination (${applicationId}).`,
      );
    }

    res.status(201).json({
      applications: created.map(appToApi),
      message:
        existingCount > 0
          ? "Category added to your nomination"
          : "Categories saved — one nomination form covers shared answers",
    });
  },
);

applicationsRouter.post("/", requireAuth, requireRoles("APPLICANT", "ADMINISTRATOR"), async (req: AuthRequest, res) => {
  const schema = z.object({
    categoryCode: z.string().min(2),
    categorySlug: z.string().min(2),
    categoryTitle: z.string().min(2),
    organisationName: z.string().optional(),
    sector: z.string().optional(),
    msme: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const user = req.user!;

  if (user.roles.includes("APPLICANT") && !user.roles.includes("ADMINISTRATOR")) {
    const org = await prisma.organisation.findUnique({ where: { ownerId: user.id } });
    if (!isProfileComplete(org)) {
      return res.status(400).json({
        error: "Complete your business profile before choosing award categories",
      });
    }
  }

  const existing = await prisma.application.findMany({
    where: { applicantId: user.id },
    select: { categoryCode: true },
  });
  if (existing.length >= 2 && user.roles.includes("APPLICANT")) {
    return res.status(400).json({ error: "Maximum 2 category applications" });
  }
  if (existing.some((a) => a.categoryCode === parsed.data.categoryCode)) {
    return res.status(400).json({ error: "This category is already selected" });
  }

  const org = await prisma.organisation.findUnique({ where: { ownerId: user.id } });
  const seedDraft = await siblingSharedDraftSeed(user.id);
  const applicationId = await nextApplicationId(parsed.data.categoryCode);
  const app = await prisma.application.create({
    data: {
      applicationId,
      categoryCode: parsed.data.categoryCode,
      categorySlug: parsed.data.categorySlug,
      categoryTitle: parsed.data.categoryTitle,
      status: "DRAFT",
      progress: seedDraft
        ? computeDraftProgress(
            ((seedDraft as { answers?: Record<string, unknown> }).answers ||
              {}) as Record<string, unknown>,
            ((seedDraft as { step?: number }).step || 5) as number,
          )
        : 5,
      applicantId: user.id,
      organisationId: org?.id,
      organisationName: parsed.data.organisationName || org?.legalName || user.orgName || "Organisation",
      sector: parsed.data.sector || org?.industry || "General",
      msme: parsed.data.msme || org?.classification || "Small",
      adminDecision: "PENDING",
      ...(seedDraft ? { draftJson: seedDraft } : {}),
    },
  });

  await audit({
    actorId: user.id,
    role: "APPLICANT",
    action: "APPLICATION_CREATED",
    applicationId,
  });
  await notify(
    user.id,
    "Category added",
    `${parsed.data.categoryTitle} added to your nomination (${applicationId}).`,
  );
  res.status(201).json({ application: appToApi(app) });
});

applicationsRouter.patch("/:applicationId", requireAuth, async (req: AuthRequest, res) => {
  const id = String(req.params.applicationId);
  const app = await prisma.application.findFirst({
    where: { OR: [{ applicationId: id }, { id }] },
  });
  if (!app) return res.status(404).json({ error: "Not found" });
  if (app.applicantId !== req.user!.id && !req.user!.roles.includes("ADMINISTRATOR")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (app.status !== "DRAFT" && req.body?.draftJson) {
    return res.status(400).json({ error: "Submitted applications are frozen unless reopened" });
  }

  const data: { draftJson?: object; progress?: number } = {};
  if (req.body?.draftJson !== undefined && req.body?.draftJson !== null) {
    data.draftJson = req.body.draftJson as object;
  }
  if (typeof req.body?.progress === "number") {
    data.progress = req.body.progress;
  }

  const updated = await prisma.application.update({
    where: { id: app.id },
    data,
  });

  // Sync shared answers to sibling category drafts (one nomination, multiple categories)
  if (data.draftJson && typeof data.draftJson === "object") {
    await syncSharedAnswersToDraftSiblings(
      app.applicantId,
      app.id,
      parseDraft(data.draftJson),
    );
  }

  // Keep org-level uploads linked to this application when saving a draft
  if (data.draftJson && app.organisationId) {
    await prisma.document.updateMany({
      where: {
        organisationId: app.organisationId,
        OR: [{ applicationId: null }, { applicationId: app.id }],
      },
      data: { applicationId: app.id },
    });
  }

  await audit({
    actorId: req.user!.id,
    role: req.user!.roles[0],
    action: "DRAFT_SAVED",
    applicationId: app.applicationId,
    afterJson: {
      progress: updated.progress,
      answerKeys:
        data.draftJson && typeof data.draftJson === "object" && "answers" in data.draftJson
          ? Object.keys((data.draftJson as { answers?: object }).answers || {})
          : [],
    },
  });
  res.json({ application: appToApi(updated) });
});

applicationsRouter.delete(
  "/:applicationId",
  requireAuth,
  requireRoles("APPLICANT", "ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.applicationId);
    const app = await prisma.application.findFirst({
      where: { OR: [{ applicationId: id }, { id }] },
    });
    if (!app) return res.status(404).json({ error: "Not found" });

    const user = req.user!;
    const isAdmin = user.roles.includes("ADMINISTRATOR");
    if (app.applicantId !== user.id && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const lockedStatuses: ApplicationStatus[] = [
      "READY_FOR_JURY",
      "JURY_EVALUATION",
      "MODERATION_REQUIRED",
      "FINALIST",
      "FINAL_ASSESSMENT",
      "RANKING_READY",
      "RESULT_LOCKED",
    ];
    // Applicants cannot delete once jury/results started; administrators can force-delete.
    if (
      !isAdmin &&
      (app.adminDecision === "ACCEPTED" || lockedStatuses.includes(app.status))
    ) {
      return res.status(400).json({
        error:
          "This nomination is already in jury / results processing and cannot be deleted. Contact the secretariat if you need to withdraw.",
      });
    }

    await prisma.clarification.deleteMany({ where: { applicationId: app.id } });
    await prisma.evaluation.deleteMany({ where: { applicationId: app.id } });
    await prisma.document.deleteMany({ where: { applicationId: app.id } });
    await prisma.application.delete({ where: { id: app.id } });

    await audit({
      actorId: user.id,
      role: user.roles[0],
      action: isAdmin ? "APPLICATION_DELETED_BY_ADMIN" : "APPLICATION_DELETED",
      applicationId: app.applicationId,
      afterJson: {
        categoryCode: app.categoryCode,
        categoryTitle: app.categoryTitle,
        status: app.status,
        adminDecision: app.adminDecision,
      },
    });

    if (!isAdmin) {
      await notify(
        app.applicantId,
        "Application removed",
        `${app.applicationId} (${app.categoryTitle}) was deleted. You are no longer participating in this category.`,
      );
    } else if (app.applicantId !== user.id) {
      await notify(
        app.applicantId,
        "Application removed by secretariat",
        `${app.applicationId} (${app.categoryTitle}) was removed by the Awards Secretariat.`,
      ).catch(() => undefined);
    }

    res.json({
      ok: true,
      message: isAdmin
        ? "Application deleted."
        : `Removed from ${app.categoryTitle}. You are no longer participating in this category.`,
    });
  },
);

applicationsRouter.post("/:applicationId/submit", requireAuth, async (req: AuthRequest, res) => {
  const id = String(req.params.applicationId);
  const app = await prisma.application.findFirst({
    where: { OR: [{ applicationId: id }, { id }] },
  });
  if (!app) return res.status(404).json({ error: "Not found" });
  if (app.applicantId !== req.user!.id) return res.status(403).json({ error: "Forbidden" });
  if (app.status !== "DRAFT") return res.status(400).json({ error: "Already submitted" });

  const draftJson =
    req.body?.draftJson !== undefined && req.body?.draftJson !== null
      ? (req.body.draftJson as object)
      : (app.draftJson as object | null) || undefined;

  const answers =
    draftJson && typeof draftJson === "object" && "answers" in draftJson
      ? ((draftJson as { answers?: Record<string, unknown> }).answers || {})
      : {};

  const { missingNominationFields, categoryQuestionCount } = await import(
    "../lib/nominationCompleteness"
  );
  const missingAnswers = missingNominationFields(answers, categoryQuestionCount(app.categoryCode));
  if (missingAnswers.length) {
    return res.status(400).json({
      error: `Please complete all nomination sections before submit. Missing: ${missingAnswers.slice(0, 6).join(", ")}${missingAnswers.length > 6 ? "…" : ""}`,
      missing: missingAnswers,
    });
  }

  const { getMandatoryDocumentStatus } = await import("../lib/documentChecks");
  const docsStatus = await getMandatoryDocumentStatus(app.applicantId, app.id);
  if (!docsStatus.complete) {
    return res.status(400).json({
      error: `Upload all mandatory documents before submit (${docsStatus.completeCount}/${docsStatus.total}). Missing: ${docsStatus.missing.join(", ")}`,
      missingDocuments: docsStatus.missing,
    });
  }

  // Persist final answers + document snapshot before flipping status
  if (draftJson && app.organisationId) {
    await prisma.document.updateMany({
      where: {
        organisationId: app.organisationId,
        OR: [{ applicationId: null }, { applicationId: app.id }],
      },
      data: { applicationId: app.id },
    });
  }

  const updated = await prisma.application.update({
    where: { id: app.id },
    data: {
      ...(draftJson ? { draftJson } : {}),
      status: "ELIGIBILITY_REVIEW",
      progress: 100,
      submittedAt: new Date(),
      assignedJuryIds: [],
      adminDecision: "PENDING",
      rejectionReason: null,
      verifiedAt: null,
      verifiedBy: null,
    },
  });

  // Keep sibling drafts in sync with the shared answers just submitted
  if (draftJson && typeof draftJson === "object") {
    await syncSharedAnswersToDraftSiblings(app.applicantId, app.id, parseDraft(draftJson));
  }

  await audit({
    actorId: req.user!.id,
    role: "APPLICANT",
    action: "APPLICATION_SUBMITTED",
    applicationId: app.applicationId,
    afterJson: {
      status: updated.status,
      answersStored: Boolean(draftJson),
      answerKeys: Object.keys(answers),
      documentCount: docsStatus.completeCount,
    },
  });
  await notify(
    req.user!.id,
    "Application submitted",
    `${app.applicationId} is awaiting Admin verification.`,
  );

  const admins = await prisma.user.findMany({
    where: { roles: { has: "ADMINISTRATOR" } },
  });
  await Promise.all(
    admins.map((a) =>
      notify(
        a.id,
        "New nomination for verification",
        `${app.applicationId} · ${updated.organisationName} · ${updated.categoryTitle}`,
      ),
    ),
  );

  res.json({ application: appToApi(updated), message: "Submitted for eligibility review" });
});

async function juryForCategory(categoryCode: string) {
  const jury = await prisma.user.findMany({
    where: {
      active: true,
      OR: [{ roles: { has: "JURY" } }, { roles: { has: "JURY_CHAIR" } }],
    },
  });
  return jury.filter(
    (u) => !u.categoryCodes.length || u.categoryCodes.includes(categoryCode),
  );
}

applicationsRouter.post(
  "/:applicationId/accept-for-jury",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION"),
  async (req: AuthRequest, res) => {
    if (resultsLocked) return res.status(423).json({ error: "Results locked" });
    const id = String(req.params.applicationId);
    const app = await prisma.application.findFirst({
      where: { OR: [{ applicationId: id }, { id }] },
    });
    if (!app) return res.status(404).json({ error: "Not found" });
    if (["NOT_QUALIFIED", "DISQUALIFIED"].includes(app.status) || app.adminDecision === "REJECTED") {
      return res.status(400).json({ error: "Cannot accept a rejected / disqualified application" });
    }
    if (app.status === "DRAFT") {
      return res.status(400).json({ error: "Application not submitted yet" });
    }

    let juryIds: string[] = Array.isArray(req.body?.juryIds) ? req.body.juryIds : [];
    if (!juryIds.length) {
      juryIds = (await juryForCategory(app.categoryCode)).map((u) => u.id);
    }
    if (!juryIds.length) {
      return res.status(400).json({
        error: `No active jury for category ${app.categoryCode}. Add jury profiles first.`,
      });
    }

    const note = String(req.body?.reason || "Verified and accepted by Admin").trim();
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: {
        assignedJuryIds: juryIds,
        status: "JURY_EVALUATION",
        adminDecision: "ACCEPTED",
        rejectionReason: null,
        verifiedAt: new Date(),
        verifiedBy: req.user!.fullName,
        evaluationDeadline: (() => {
          const d = new Date();
          d.setDate(d.getDate() + Number(process.env.EVALUATION_DEADLINE_DAYS || 21));
          return d;
        })(),
      },
    });

    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "ADMIN_ACCEPTED",
      applicationId: app.applicationId,
      reason: note,
      afterJson: { juryIds },
    });
    await notify(
      app.applicantId,
      "Nomination verified",
      `${app.applicationId} was verified by Admin and is now under jury evaluation.`,
    );
    await Promise.all(
      juryIds.map((jid) =>
        notify(
          jid,
          "New evaluation assigned",
          `${app.applicationId} · ${updated.organisationName} · ${updated.categoryTitle}`,
        ),
      ),
    );
    res.json({
      application: appToApi(updated),
      assignedJuryCount: juryIds.length,
      message: "Accepted — assigned to category jury",
    });
  },
);

applicationsRouter.post(
  "/:applicationId/reject",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION"),
  async (req: AuthRequest, res) => {
    if (resultsLocked) return res.status(423).json({ error: "Results locked" });
    const id = String(req.params.applicationId);
    const app = await prisma.application.findFirst({
      where: { OR: [{ applicationId: id }, { id }] },
    });
    if (!app) return res.status(404).json({ error: "Not found" });
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 8) {
      return res.status(400).json({
        error: "Please provide a clear reason (min 8 characters)",
      });
    }
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: {
        status: "NOT_QUALIFIED",
        adminDecision: "REJECTED",
        rejectionReason: reason,
        assignedJuryIds: [],
        verifiedAt: new Date(),
        verifiedBy: req.user!.fullName,
        progress: Math.max(app.progress, app.status === "DRAFT" ? app.progress : 100),
      },
    });
    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "ADMIN_NOT_PROCEEDING",
      applicationId: app.applicationId,
      reason,
    });
    await notify(
      app.applicantId,
      "We are not proceeding with this application",
      `${app.applicationId}: ${reason}`,
    );
    res.json({
      application: appToApi(updated),
      message: "Marked not proceeding — applicant will see this on their dashboard",
    });
  },
);

applicationsRouter.patch(
  "/:applicationId/status",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    if (resultsLocked) return res.status(423).json({ error: "Results locked" });
    const id = String(req.params.applicationId);
    const app = await prisma.application.findFirst({
      where: { OR: [{ applicationId: id }, { id }] },
    });
    if (!app) return res.status(404).json({ error: "Not found" });
    const status = req.body?.status as ApplicationStatus;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: { status },
    });
    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "STATUS_CHANGED",
      applicationId: app.applicationId,
      reason: req.body?.reason,
      afterJson: { status },
    });
    await notify(app.applicantId, "Status update", `${app.applicationId} is now ${status}.`);
    res.json({ application: appToApi(updated) });
  },
);

applicationsRouter.post(
  "/:applicationId/assign",
  requireAuth,
  requireRoles("ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const id = String(req.params.applicationId);
    const app = await prisma.application.findFirst({
      where: { OR: [{ applicationId: id }, { id }] },
    });
    if (!app) return res.status(404).json({ error: "Not found" });
    const juryIds = z.array(z.string()).min(3).safeParse(req.body?.juryIds);
    if (!juryIds.success) return res.status(400).json({ error: "Assign at least 3 jury members" });
    const updated = await prisma.application.update({
      where: { id: app.id },
      data: {
        assignedJuryIds: juryIds.data,
        status: "JURY_EVALUATION",
        adminDecision: "ACCEPTED",
        rejectionReason: null,
        verifiedAt: app.verifiedAt ?? new Date(),
        verifiedBy: app.verifiedBy ?? req.user!.fullName,
      },
    });
    await audit({
      actorId: req.user!.id,
      role: "ADMINISTRATOR",
      action: "JURY_ASSIGNED",
      applicationId: app.applicationId,
      afterJson: { juryIds: juryIds.data },
    });
    await Promise.all(
      juryIds.data.map((jid) =>
        notify(jid, "New evaluation assigned", `${app.applicationId} requires your evaluation.`),
      ),
    );
    res.json({ application: appToApi(updated) });
  },
);

export function setResultsLocked(v: boolean) {
  resultsLocked = v;
}
export function getResultsLocked() {
  return resultsLocked;
}
