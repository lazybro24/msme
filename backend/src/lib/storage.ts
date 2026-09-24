import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { uploadRoot } from "./upload";

export type FileKind = "documents" | "jury" | "help";

function s3Enabled() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

function s3Client() {
  const endpoint = process.env.S3_ENDPOINT; // e.g. https://<account>.r2.cloudflarestorage.com
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint), // required for many S3-compatible providers (R2)
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

function s3Key(kind: FileKind, filename: string) {
  const prefix = (process.env.S3_PREFIX || "msme").replace(/\/$/, "");
  return `${prefix}/${kind}/${filename}`;
}

export function localPath(kind: FileKind, filename: string) {
  return path.join(uploadRoot, kind, filename);
}

/** API path stored in DB / returned to clients (not publicly browsable). */
export function publicFilePath(kind: FileKind, filename: string) {
  return `/api/files/${kind}/${filename}`;
}

/** Normalize legacy `/uploads/...` and new `/api/files/...` URLs. */
export function parseFileRef(fileUrl: string | null | undefined): { kind: FileKind; filename: string } | null {
  if (!fileUrl) return null;
  const raw = fileUrl.split("?")[0];
  const m =
    raw.match(/^\/api\/files\/(documents|jury|help)\/([^/]+)$/) ||
    raw.match(/^\/uploads\/(documents|jury|help)\/([^/]+)$/);
  if (!m) return null;
  return { kind: m[1] as FileKind, filename: decodeURIComponent(m[2]) };
}

export async function persistUploadedFile(opts: {
  kind: FileKind;
  filename: string;
  absolutePath: string;
  contentType?: string;
}) {
  if (!s3Enabled()) return;
  const body = fs.readFileSync(opts.absolutePath);
  await s3Client().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key(opts.kind, opts.filename),
      Body: body,
      ContentType: opts.contentType || "application/octet-stream",
    }),
  );
}

export async function openStoredFile(kind: FileKind, filename: string): Promise<{
  stream: NodeJS.ReadableStream;
  contentType?: string;
  contentLength?: number;
} | null> {
  const safe = path.basename(filename);
  if (!safe || safe !== filename.replace(/\\/g, "/").split("/").pop()) {
    return null;
  }

  const disk = localPath(kind, safe);
  if (fs.existsSync(disk)) {
    const stat = fs.statSync(disk);
    return {
      stream: fs.createReadStream(disk),
      contentLength: stat.size,
    };
  }

  if (!s3Enabled()) return null;

  try {
    const out = await s3Client().send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key(kind, safe),
      }),
    );
    if (!out.Body) return null;
    return {
      stream: out.Body as NodeJS.ReadableStream,
      contentType: out.ContentType || undefined,
      contentLength: out.ContentLength,
    };
  } catch {
    return null;
  }
}

export async function deleteStoredFile(kind: FileKind, filename: string) {
  const safe = path.basename(filename);
  const disk = localPath(kind, safe);
  if (fs.existsSync(disk)) {
    try {
      fs.unlinkSync(disk);
    } catch {
      /* ignore */
    }
  }
  if (!s3Enabled()) return;
  try {
    await s3Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key(kind, safe),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function storageMode() {
  return s3Enabled() ? "s3" : "local";
}
