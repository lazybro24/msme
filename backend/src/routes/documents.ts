import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, requireAuth, requireRoles } from "../lib/auth";
import { documentUpload } from "../lib/upload";
import {
  deleteStoredFile,
  parseFileRef,
  persistUploadedFile,
  publicFilePath,
} from "../lib/storage";

export const documentsRouter = Router();

export const MANDATORY_DOCUMENTS = [
  "Udyam Certificate",
  "PAN",
  "GST Certificate",
  "Incorporation / Registration Proof",
  "Proof of Mysuru Operations",
  "Financial / Performance Evidence",
  "Authorized Applicant Declaration",
] as const;

async function getMandatoryNames() {
  const rows = await prisma.documentRequirement.findMany({
    where: { active: true, mandatory: true },
    orderBy: { sortOrder: "asc" },
  });
  if (rows.length === 0) return [...MANDATORY_DOCUMENTS];
  return rows.map((r) => r.name);
}

function matchesMandatory(docName: string, mandatoryName: string) {
  const a = docName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const b = mandatoryName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Keyword overlap (e.g. "Udyam Registration Certificate" ↔ "Udyam Certificate")
  const aWords = new Set(a.split(" ").filter((w) => w.length > 2));
  const bWords = b.split(" ").filter((w) => w.length > 2);
  const hits = bWords.filter((w) => aWords.has(w)).length;
  return hits >= Math.min(2, bWords.length);
}

function mapDoc(d: {
  id: string;
  name: string;
  evidenceType: string;
  period: string | null;
  description: string | null;
  visibility: string;
  fileUrl: string | null;
  fileName: string | null;
  applicationId: string | null;
  organisationId: string | null;
  createdAt: Date;
}) {
  const ref = parseFileRef(d.fileUrl);
  return {
    id: d.id,
    name: d.name,
    evidenceType: d.evidenceType,
    period: d.period,
    description: d.description,
    visibility: d.visibility,
    fileUrl: ref ? publicFilePath(ref.kind, ref.filename) : d.fileUrl,
    fileName: d.fileName,
    applicationId: d.applicationId,
    organisationId: d.organisationId,
    createdAt: d.createdAt.toISOString(),
  };
}

async function applicantScope(userId: string) {
  const org = await prisma.organisation.findUnique({ where: { ownerId: userId } });
  const apps = await prisma.application.findMany({
    where: { applicantId: userId },
    select: { id: true, applicationId: true, categoryTitle: true },
    orderBy: { updatedAt: "desc" },
  });
  return { org, apps };
}

documentsRouter.get(
  "/",
  requireAuth,
  requireRoles("APPLICANT", "ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const user = req.user!;
    const { org, apps } = await applicantScope(user.id);
    const appIds = apps.map((a) => a.id);
    const publicIds = apps.map((a) => a.applicationId);

    const docs = await prisma.document.findMany({
      where: {
        OR: [
          ...(org ? [{ organisationId: org.id }] : []),
          ...(appIds.length ? [{ applicationId: { in: appIds } }] : []),
          ...(publicIds.length ? [{ applicationId: { in: publicIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const mandatoryNames = await getMandatoryNames();
    const mandatory = mandatoryNames.map((name) => {
      const match = docs.find((d) => matchesMandatory(d.name, name) && d.fileUrl);
      return {
        name,
        done: Boolean(match),
        documentId: match?.id ?? null,
        fileUrl: match?.fileUrl ?? null,
        fileName: match?.fileName ?? null,
      };
    });

    res.json({
      documents: docs.map(mapDoc),
      mandatory,
      applications: apps,
      organisationId: org?.id ?? null,
      completeCount: mandatory.filter((m) => m.done).length,
      totalMandatory: mandatory.length,
    });
  },
);

/** Admin / verification / jury: list files for one application */
documentsRouter.get(
  "/application/:applicationRef",
  requireAuth,
  requireRoles("ADMINISTRATOR", "VERIFICATION", "JURY", "JURY_CHAIR", "OBSERVER"),
  async (req, res) => {
    const ref = String(req.params.applicationRef);
    const app = await prisma.application.findFirst({
      where: { OR: [{ id: ref }, { applicationId: ref }] },
      include: { organisation: true },
    });
    if (!app) return res.status(404).json({ error: "Application not found" });

    const docs = await prisma.document.findMany({
      where: {
        OR: [
          { applicationId: app.id },
          { applicationId: app.applicationId },
          ...(app.organisationId ? [{ organisationId: app.organisationId }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const mandatoryNames = await getMandatoryNames();
    const mandatory = mandatoryNames.map((name) => {
      const match = docs.find((d) => matchesMandatory(d.name, name) && d.fileUrl);
      return {
        name,
        done: Boolean(match),
        documentId: match?.id ?? null,
        fileUrl: match?.fileUrl ?? null,
        fileName: match?.fileName ?? null,
      };
    });

    res.json({
      applicationId: app.applicationId,
      organisationName: app.organisationName,
      documents: docs.map(mapDoc),
      mandatory,
      completeCount: mandatory.filter((m) => m.done).length,
      totalMandatory: mandatory.length,
    });
  },
);

documentsRouter.post(
  "/",
  requireAuth,
  requireRoles("APPLICANT", "ADMINISTRATOR"),
  (req: AuthRequest, res) => {
    documentUpload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message || "Upload failed" });
      if (!req.file) return res.status(400).json({ error: "File is required" });

      try {
        const user = req.user!;
        const { org, apps } = await applicantScope(user.id);
        if (!org && !apps.length) {
          return res.status(400).json({
            error: "Complete your business profile before uploading documents",
          });
        }

        const name = String(req.body?.name || "").trim();
        const evidenceType = String(req.body?.evidenceType || req.body?.type || "Other").trim();
        const period = String(req.body?.period || "").trim() || null;
        const description = String(req.body?.description || "").trim() || null;
        const visibility = String(req.body?.visibility || "Confidential").trim() || "Confidential";
        const applicationRef = String(req.body?.applicationId || "").trim();

        if (!name) return res.status(400).json({ error: "Document name is required" });

        let applicationId: string | null = null;
        if (applicationRef) {
          const app = apps.find(
            (a) => a.id === applicationRef || a.applicationId === applicationRef,
          );
          if (!app) return res.status(400).json({ error: "Invalid application" });
          applicationId = app.id;
        } else if (apps[0]) {
          applicationId = apps[0].id;
        }

        const fileUrl = publicFilePath("documents", req.file.filename);
        const fileName = req.file.originalname;
        await persistUploadedFile({
          kind: "documents",
          filename: req.file.filename,
          absolutePath: req.file.path,
          contentType: req.file.mimetype,
        });

        // Replace prior mandatory doc of same name for this org/app
        const existing = await prisma.document.findMany({
          where: {
            name,
            OR: [
              ...(org ? [{ organisationId: org.id }] : []),
              ...(applicationId ? [{ applicationId }] : []),
            ],
          },
        });
        if (existing.length) {
          for (const e of existing) {
            const ref = parseFileRef(e.fileUrl);
            if (ref) await deleteStoredFile(ref.kind, ref.filename);
          }
          await prisma.document.deleteMany({
            where: { id: { in: existing.map((e) => e.id) } },
          });
        }

        const doc = await prisma.document.create({
          data: {
            name,
            evidenceType,
            period,
            description,
            visibility,
            fileUrl,
            fileName,
            organisationId: org?.id ?? null,
            applicationId,
          },
        });

        res.status(201).json({ document: mapDoc(doc), message: "Document uploaded" });
      } catch (e) {
        res.status(500).json({
          error: e instanceof Error ? e.message : "Upload failed",
        });
      }
    });
  },
);

documentsRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("APPLICANT", "ADMINISTRATOR"),
  async (req: AuthRequest, res) => {
    const user = req.user!;
    const { org, apps } = await applicantScope(user.id);
    const appIds = apps.map((a) => a.id);
    const doc = await prisma.document.findFirst({
      where: {
        id: String(req.params.id),
        OR: [
          ...(org ? [{ organisationId: org.id }] : []),
          ...(appIds.length ? [{ applicationId: { in: appIds } }] : []),
        ],
      },
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    const ref = parseFileRef(doc.fileUrl);
    if (ref) await deleteStoredFile(ref.kind, ref.filename);
    await prisma.document.delete({ where: { id: doc.id } });
    res.json({ ok: true });
  },
);
