import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { healthRouter } from "./routes/health";
import { enquiriesRouter } from "./routes/enquiries";
import { partnershipsRouter } from "./routes/partnerships";
import { applicationsRouter } from "./routes/applications";
import { authRouter } from "./routes/auth";
import { clarificationsRouter } from "./routes/clarifications";
import { evaluationsRouter } from "./routes/evaluations";
import { adminRouter } from "./routes/admin";
import { adminControlRouter } from "./routes/adminControl";
import { miscRouter } from "./routes/misc";
import { documentsRouter } from "./routes/documents";
import { publicContentRouter } from "./routes/publicContent";
import { filesRouter } from "./routes/files";
import { storageMode } from "./lib/storage";

export function createApp() {
  const app = express();
  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";

  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth attempts. Try again in 15 minutes." },
  });
  const publicFormLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many submissions. Try again later." },
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/verify-otp", authLimiter);
  app.use("/api/auth/resend-otp", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/auth/reset-password", authLimiter);
  app.use("/api/enquiries", publicFormLimiter);
  app.use("/api/partnerships", publicFormLimiter);

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/clarifications", clarificationsRouter);
  app.use("/api/evaluations", evaluationsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/admin", adminControlRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/public", publicContentRouter);
  app.use("/api/enquiries", enquiriesRouter);
  app.use("/api/partnerships", partnershipsRouter);
  app.use("/api", miscRouter);

  app.get("/", (_req, res) => {
    res.json({
      name: "Mysuru MSME Awards 2026 API",
      mode: "postgresql (Neon / Prisma)",
      storage: storageMode(),
      docs: {
        auth: "POST /api/auth/login | /register | /verify-otp",
        files: "GET /api/files/:kind/:filename (Bearer or ?token=)",
        applications: "/api/applications",
        clarifications: "/api/clarifications",
        evaluations: "/api/evaluations",
        admin: "/api/admin/*",
      },
    });
  });

  return app;
}
