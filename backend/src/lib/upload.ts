import fs from "fs";
import path from "path";
import multer from "multer";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const juryDir = path.join(uploadRoot, "jury");
const helpDir = path.join(uploadRoot, "help");
const docsDir = path.join(uploadRoot, "documents");

for (const dir of [uploadRoot, juryDir, helpDir, docsDir]) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.warn("[upload] could not create", dir, err);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, juryDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

export const juryPhotoUpload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const helpStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, helpDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

export const helpAttachmentUpload = multer({
  storage: helpStorage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const docsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docsDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
    cb(null, safe);
  },
});

const DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);
const DOCUMENT_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".xlsx", ".xls"]);

export const documentUpload = multer({
  storage: docsStorage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!DOCUMENT_MIME.has(file.mimetype) && !DOCUMENT_EXT.has(ext)) {
      cb(new Error("Only PDF, JPG, PNG or XLSX files are supported"));
      return;
    }
    cb(null, true);
  },
});

export { uploadRoot };
