import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { healthRouter } from "./routes/health";

type RootState = { status: string; storage: string };

function applyBaseMiddleware(app: Express) {
  const raw = process.env.CORS_ORIGIN || "http://localhost:3000";
  const origins = raw.split(",").map((s) => s.trim()).filter(Boolean);

  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: origins.length === 1 ? origins[0] : origins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
}

/**
 * Minimal app: health + root only. No Prisma / routes that can crash boot.
 * Railway must be able to hit /api/health as soon as the process starts.
 */
export function createApp(): Express {
  const app = express();
  applyBaseMiddleware(app);

  app.use("/api/health", healthRouter);

  // Single root handler — mountApiRoutes flips status/storage after routes load.
  // (Express keeps the first app.get("/") forever; registering a second one never runs.)
  const rootState: RootState = { status: "booting", storage: "pending" };
  app.locals.rootState = rootState;

  app.get("/", (_req, res) => {
    const state = app.locals.rootState as RootState;
    if (state.status === "ok") {
      return res.json({
        name: "Mysuru MSME Awards 2026 API",
        mode: "postgresql (Neon / Prisma)",
        storage: state.storage,
        docs: {
          auth: "POST /api/auth/login | /register | /verify-totp",
          files: "GET /api/files/:kind/:filename (Bearer or ?token=)",
          applications: "/api/applications",
          clarifications: "/api/clarifications",
          evaluations: "/api/evaluations",
          admin: "/api/admin/*",
        },
      });
    }
    res.json({
      name: "Mysuru MSME Awards 2026 API",
      status: state.status,
      health: "/api/health",
    });
  });

  return app;
}

/** Mount full API after listen — imports Prisma-heavy routers here. */
export async function mountApiRoutes(app: Express): Promise<void> {
  const [
    { enquiriesRouter },
    { partnershipsRouter },
    { applicationsRouter },
    { authRouter },
    { clarificationsRouter },
    { evaluationsRouter },
    { adminRouter },
    { adminControlRouter },
    { miscRouter },
    { documentsRouter },
    { publicContentRouter },
    { filesRouter },
    { storageMode },
  ] = await Promise.all([
    import("./routes/enquiries"),
    import("./routes/partnerships"),
    import("./routes/applications"),
    import("./routes/auth"),
    import("./routes/clarifications"),
    import("./routes/evaluations"),
    import("./routes/admin"),
    import("./routes/adminControl"),
    import("./routes/misc"),
    import("./routes/documents"),
    import("./routes/publicContent"),
    import("./routes/files"),
    import("./lib/storage"),
  ]);

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
  app.use("/api/auth/verify-totp", authLimiter);
  app.use("/api/enquiries", publicFormLimiter);
  app.use("/api/partnerships", publicFormLimiter);

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

  const rootState = app.locals.rootState as RootState | undefined;
  if (rootState) {
    rootState.status = "ok";
    rootState.storage = storageMode();
  }
}
