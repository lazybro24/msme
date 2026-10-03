/**
 * Fail fast in production when critical config is missing or unsafe.
 * Call once during boot after env is loaded.
 */
export function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  const origins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasProdOrigin = origins.some(
    (o) => !o.includes("localhost") && !o.includes("127.0.0.1"),
  );
  if (!hasProdOrigin) {
    missing.push("CORS_ORIGIN (must include your production site origin, not only localhost)");
  }
  if (!process.env.S3_BUCKET?.trim()) missing.push("S3_BUCKET");
  if (!process.env.S3_ACCESS_KEY_ID?.trim()) missing.push("S3_ACCESS_KEY_ID");
  if (!process.env.S3_SECRET_ACCESS_KEY?.trim()) missing.push("S3_SECRET_ACCESS_KEY");

  if (missing.length) {
    throw new Error(
      `[prod] Missing or unsafe configuration: ${missing.join(", ")}. ` +
        `Set these on Railway Variables before serving traffic.`,
    );
  }

  if (process.env.DEMO_USERS_ENABLED === "true") {
    throw new Error("[prod] DEMO_USERS_ENABLED must not be true in production.");
  }

  if (process.env.ALLOW_PROD_SEED === "true") {
    console.warn("[prod] ALLOW_PROD_SEED=true — avoid leaving this enabled after bootstrap.");
  }
}
