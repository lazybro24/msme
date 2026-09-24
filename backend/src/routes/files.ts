import { Router } from "express";
import path from "path";
import type { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, getUserFromToken, type AuthUser } from "../lib/auth";
import { openStoredFile, parseFileRef, type FileKind } from "../lib/storage";

export const filesRouter = Router();

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function userFromRequest(req: AuthRequest): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const q = typeof req.query.token === "string" ? req.query.token : undefined;
  return getUserFromToken(bearer || q);
}

function requireFileAuth(req: AuthRequest, res: Response, next: NextFunction) {
  void userFromRequest(req)
    .then((user) => {
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      req.user = user;
      next();
    })
    .catch(() => res.status(401).json({ error: "Unauthorized" }));
}

async function canAccessDocument(user: AuthUser, filename: string): Promise<boolean> {
  const staff = ["ADMINISTRATOR", "VERIFICATION", "JURY", "JURY_CHAIR", "OBSERVER"] as const;
  if (staff.some((r) => user.roles.includes(r))) return true;

  const candidates = [
    `/api/files/documents/${filename}`,
    `/api/files/documents/${encodeURIComponent(filename)}`,
    `/uploads/documents/${filename}`,
  ];
  const docs = await prisma.document.findMany({
    where: { OR: candidates.map((fileUrl) => ({ fileUrl })) },
    select: { organisationId: true, applicationId: true },
  });
  if (!docs.length) {
    // Filename-only match (legacy encoding differences)
    const all = await prisma.document.findMany({
      where: { fileUrl: { contains: filename } },
      select: { organisationId: true, applicationId: true, fileUrl: true },
    });
    const matched = all.filter((d) => {
      const ref = parseFileRef(d.fileUrl);
      return ref?.kind === "documents" && ref.filename === filename;
    });
    if (!matched.length) return false;
    return ownsAny(user.id, matched);
  }
  return ownsAny(user.id, docs);
}

async function ownsAny(
  userId: string,
  docs: { organisationId: string | null; applicationId: string | null }[],
) {
  const org = await prisma.organisation.findUnique({ where: { ownerId: userId } });
  const apps = await prisma.application.findMany({
    where: { applicantId: userId },
    select: { id: true, applicationId: true },
  });
  const appIds = new Set(apps.flatMap((a) => [a.id, a.applicationId]));
  return docs.some(
    (d) =>
      (org && d.organisationId === org.id) ||
      (d.applicationId && appIds.has(d.applicationId)),
  );
}

async function canAccessJuryPhoto(user: AuthUser, filename: string): Promise<boolean> {
  if (["ADMINISTRATOR", "JURY_CHAIR", "OBSERVER"].some((r) => user.roles.includes(r as never))) {
    return true;
  }
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { photoUrl: true } });
  if (!me?.photoUrl) return false;
  const ref = parseFileRef(me.photoUrl);
  return ref?.kind === "jury" && ref.filename === filename;
}

async function canAccessHelp(user: AuthUser, filename: string): Promise<boolean> {
  if (["ADMINISTRATOR", "VERIFICATION"].some((r) => user.roles.includes(r as never))) {
    return true;
  }
  const urls = [
    `/api/files/help/${filename}`,
    `/uploads/help/${filename}`,
  ];
  const ticket = await prisma.helpTicket.findFirst({
    where: {
      userId: user.id,
      OR: urls.map((attachmentUrl) => ({ attachmentUrl })),
    },
    select: { id: true },
  });
  return Boolean(ticket);
}

filesRouter.get("/:kind/:filename", requireFileAuth, async (req: AuthRequest, res) => {
  const kind = String(req.params.kind) as FileKind;
  const filename = path.basename(decodeURIComponent(String(req.params.filename || "")));
  if (!["documents", "jury", "help"].includes(kind) || !filename) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  const user = req.user!;
  let allowed = false;
  if (kind === "documents") allowed = await canAccessDocument(user, filename);
  else if (kind === "jury") allowed = await canAccessJuryPhoto(user, filename);
  else if (kind === "help") allowed = await canAccessHelp(user, filename);

  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const file = await openStoredFile(kind, filename);
  if (!file) return res.status(404).json({ error: "File not found" });

  const ext = path.extname(filename).toLowerCase();
  const type = file.contentType || MIME[ext] || "application/octet-stream";
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, "")}"`);
  res.setHeader("Cache-Control", "private, no-store");
  if (file.contentLength) res.setHeader("Content-Length", String(file.contentLength));
  file.stream.pipe(res);
});
