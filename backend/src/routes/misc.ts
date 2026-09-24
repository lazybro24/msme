import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth } from "../lib/auth";
import {
  audit,
  isProfileComplete,
  notify,
  orgToProfile,
  type ProfilePayload,
} from "../lib/users";
import { helpAttachmentUpload } from "../lib/upload";
import { persistUploadedFile, publicFilePath } from "../lib/storage";

export const miscRouter = Router();

miscRouter.get("/notifications", requireAuth, async (req: AuthRequest, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { at: "desc" },
  });
  res.json({
    notifications: items.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      body: n.body,
      read: n.read,
      at: n.at.toISOString(),
    })),
  });
});

miscRouter.post("/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId: req.user!.id },
  });
  if (!n) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.notification.update({
    where: { id: n.id },
    data: { read: true },
  });
  res.json({ notification: updated });
});

miscRouter.post("/help", requireAuth, (req: AuthRequest, res) => {
  helpAttachmentUpload.single("attachment")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });

    const topic = String(req.body?.topic || "").trim();
    const message = String(req.body?.message || "").trim();
    if (topic.length < 2 || message.length < 5) {
      return res.status(400).json({ error: "Topic and message are required" });
    }

    let attachmentUrl: string | undefined;
    if (req.file) {
      attachmentUrl = publicFilePath("help", req.file.filename);
      await persistUploadedFile({
        kind: "help",
        filename: req.file.filename,
        absolutePath: req.file.path,
        contentType: req.file.mimetype,
      });
    }
    const ticket = await prisma.helpTicket.create({
      data: {
        userId: req.user!.id,
        topic,
        message,
        attachmentUrl,
        status: "OPEN",
      },
    });
    await audit({
      actorId: req.user!.id,
      role: req.user!.roles[0],
      action: "HELP_TICKET_CREATED",
      afterJson: ticket,
    });
    await notify(req.user!.id, "Help ticket received", topic);
    res.status(201).json({ ticket });
  });
});

miscRouter.get("/help", requireAuth, async (req: AuthRequest, res) => {
  const items = await prisma.helpTicket.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ tickets: items });
});

miscRouter.get("/profile", requireAuth, async (req: AuthRequest, res) => {
  const org = await prisma.organisation.findUnique({ where: { ownerId: req.user!.id } });
  res.json({
    profile: orgToProfile(org),
    complete: isProfileComplete(org),
  });
});

miscRouter.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({
    legalName: z.string().min(1),
    brandName: z.string().optional().default(""),
    constitution: z.string().min(1),
    established: z.string().min(1),
    industry: z.string().min(1),
    activity: z.string().min(1),
    website: z.string().optional().default(""),
    linkedin: z.string().optional().default(""),
    registeredAddress: z.string().min(1),
    mysuruAddress: z.string().min(1),
    pinCode: z.string().min(1),
    udyam: z.string().min(1),
    udyamDate: z.string().min(1),
    classification: z.string().min(1),
    pan: z.string().min(1),
    gstin: z.string().optional().default(""),
    cin: z.string().optional().default(""),
    employees: z.string().min(1),
    locations: z.string().min(1),
    repName: z.string().min(1),
    repDesignation: z.string().min(1),
    repEmail: z.string().email(),
    repMobile: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data as ProfilePayload;

  const existing = await prisma.organisation.findUnique({ where: { ownerId: req.user!.id } });
  const draft = {
    legalName: data.legalName,
    brandName: data.brandName || null,
    constitution: data.constitution,
    established: data.established,
    industry: data.industry,
    activity: data.activity,
    website: data.website || null,
    linkedin: data.linkedin || null,
    registeredAddress: data.registeredAddress,
    mysuruAddress: data.mysuruAddress,
    pinCode: data.pinCode,
    udyam: data.udyam,
    udyamDate: data.udyamDate,
    classification: data.classification,
    pan: data.pan,
    gstin: data.gstin || null,
    cin: data.cin || null,
    employees: data.employees,
    locations: data.locations,
    repName: data.repName,
    repDesignation: data.repDesignation,
    repEmail: data.repEmail,
    repMobile: data.repMobile,
  };

  const org = existing
    ? await prisma.organisation.update({ where: { id: existing.id }, data: draft })
    : await prisma.organisation.create({
        data: { ownerId: req.user!.id, ...draft },
      });

  const complete = isProfileComplete(org);
  const withComplete = complete
    ? await prisma.organisation.update({
        where: { id: org.id },
        data: { completedAt: org.completedAt ?? new Date() },
      })
    : await prisma.organisation.update({
        where: { id: org.id },
        data: { completedAt: null },
      });

  if (complete) {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { orgName: data.legalName },
    });
  }

  await audit({
    actorId: req.user!.id,
    role: req.user!.roles[0],
    action: complete ? "BUSINESS_PROFILE_COMPLETED" : "BUSINESS_PROFILE_SAVED",
  });

  res.json({ profile: orgToProfile(withComplete), complete });
});

miscRouter.post("/profile/recommendations", requireAuth, async (req: AuthRequest, res) => {
  const slugs = z.array(z.string()).safeParse(req.body?.slugs);
  if (!slugs.success) return res.status(400).json({ error: "slugs required" });
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { recommendedSlugs: slugs.data },
  });
  res.json({ recommendedSlugs: user.recommendedSlugs });
});
