import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth, requireRoles } from "../lib/auth";
import { audit, notify } from "../lib/users";
import crypto from "crypto";

export const clarificationsRouter = Router();

clarificationsRouter.get("/", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  let list;
  if (user.roles.includes("APPLICANT") && !user.roles.includes("ADMINISTRATOR")) {
    const mine = await prisma.application.findMany({
      where: { applicantId: user.id },
      select: { applicationId: true },
    });
    const refs = mine.map((a) => a.applicationId);
    list = await prisma.clarification.findMany({
      where: { applicationRef: { in: refs } },
      orderBy: { createdAt: "desc" },
    });
  } else {
    list = await prisma.clarification.findMany({ orderBy: { createdAt: "desc" } });
  }
  res.json({
    clarifications: list.map((c) => ({
      id: c.id,
      applicationId: c.applicationRef,
      type: c.type,
      title: c.title,
      deadline: c.deadline ?? undefined,
      requiredDocument: c.requiredDocument ?? undefined,
      status: c.status,
      thread: c.thread,
    })),
  });
});

clarificationsRouter.post(
  "/",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION", "JURY", "JURY_CHAIR"),
  async (req: AuthRequest, res) => {
    const schema = z.object({
      applicationId: z.string().min(3),
      type: z.string().min(2),
      title: z.string().min(3),
      deadline: z.string().optional(),
      requiredDocument: z.string().optional(),
      message: z.string().min(5),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const app = await prisma.application.findFirst({
      where: {
        OR: [{ applicationId: parsed.data.applicationId }, { id: parsed.data.applicationId }],
      },
    });
    if (!app) return res.status(404).json({ error: "Application not found" });

    const isJury =
      req.user!.roles.includes("JURY") || req.user!.roles.includes("JURY_CHAIR");
    if (
      isJury &&
      !req.user!.roles.includes("ADMINISTRATOR") &&
      !app.assignedJuryIds.includes(req.user!.id)
    ) {
      return res.status(403).json({ error: "Not assigned to this application" });
    }

    const thread = [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        by: req.user!.fullName,
        role: req.user!.roles[0],
        body: parsed.data.message,
      },
    ];
    const item = await prisma.clarification.create({
      data: {
        applicationId: app.id,
        applicationRef: app.applicationId,
        type: parsed.data.type,
        title: parsed.data.title,
        deadline: parsed.data.deadline,
        requiredDocument: parsed.data.requiredDocument,
        status: "OPEN",
        thread,
      },
    });

    const isStaff =
      req.user!.roles.includes("ADMINISTRATOR") || req.user!.roles.includes("VERIFICATION");
    if (isStaff) {
      await prisma.application.update({
        where: { id: app.id },
        data: { status: "CLARIFICATION_REQUIRED" },
      });
    }

    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "CLARIFICATION_REQUESTED",
      applicationId: app.applicationId,
    });
    await notify(app.applicantId, "Clarification required", parsed.data.title);
    res.status(201).json({
      clarification: {
        ...item,
        applicationId: item.applicationRef,
        thread,
      },
    });
  },
);

clarificationsRouter.post("/:id/respond", requireAuth, async (req: AuthRequest, res) => {
  const item = await prisma.clarification.findUnique({ where: { id: String(req.params.id) } });
  if (!item) return res.status(404).json({ error: "Not found" });
  const app = await prisma.application.findUnique({ where: { id: item.applicationId } });
  if (!app) return res.status(404).json({ error: "Application not found" });
  if (app.applicantId !== req.user!.id && !req.user!.roles.includes("ADMINISTRATOR")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const body = String(req.body?.body || "").trim();
  if (body.length < 2) return res.status(400).json({ error: "Response required" });
  const thread = Array.isArray(item.thread) ? [...(item.thread as object[])] : [];
  thread.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    by: req.user!.fullName,
    role: req.user!.roles[0],
    body,
    documentName: req.body?.documentName || undefined,
  });
  const updated = await prisma.clarification.update({
    where: { id: item.id },
    data: { thread, status: "RESPONDED" },
  });
  await audit({
    actorId: req.user!.id,
    role: req.user!.roles[0],
    action: "CLARIFICATION_RESPONDED",
    applicationId: app.applicationId,
  });
  const verifiers = await prisma.user.findMany({
    where: { OR: [{ roles: { has: "VERIFICATION" } }, { roles: { has: "ADMINISTRATOR" } }] },
  });
  await Promise.all(
    verifiers.map((v) =>
      notify(v.id, "Clarification received", `${app.applicationId} responded.`),
    ),
  );
  res.json({
    clarification: {
      ...updated,
      applicationId: updated.applicationRef,
    },
  });
});
