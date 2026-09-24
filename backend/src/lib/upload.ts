import fs from "fs";
import path from "path";
import multer from "multer";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const juryDir = path.join(uploadRoot, "jury");
const helpDir = path.join(uploadRoot, "help");
const docsDir = path.join(uploadRoot, "documents");

for (const dir of [uploadRoot, juryDir, helpDir, docsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

const DOC_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const documentUpload = multer({
  storage: docsStorage,
  limits: { fileSize: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!DOC_MIME.has(file.mimetype) && !file.mimetype.startsWith("image/")) {
      cb(new Error("Allowed: PDF, JPG, PNG, DOC, DOCX"));
      return;
    }
    cb(null, true);
  },
});

export { uploadRoot };
