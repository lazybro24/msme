import "dotenv/config";
import { createApp, mountApiRoutes } from "./app";
import { assertProductionConfig } from "./lib/assertProduction";

const port = Number(process.env.PORT || 4000);

async function main() {
  console.log("[boot] PORT=", port, "NODE_ENV=", process.env.NODE_ENV);

  try {
    assertProductionConfig();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // 1) Bind immediately with health-only app (no Prisma).
  const app = createApp();
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Mysuru MSME Awards API listening on 0.0.0.0:${port}`);
      console.log(`Health: http://0.0.0.0:${port}/api/health`);
      resolve();
    });
    server.on("error", (err) => {
      console.error("[server] listen error:", err);
      reject(err);
    });
    process.on("SIGTERM", () => {
      console.log("[server] SIGTERM");
      server.close(() => process.exit(0));
    });
  });

  setInterval(() => {}, 60_000);
  process.on("uncaughtException", (err) => console.error("[server] uncaughtException:", err));
  process.on("unhandledRejection", (err) => console.error("[server] unhandledRejection:", err));

  // 2) Mount full API (Prisma, routes) after port is open.
  try {
    await mountApiRoutes(app);
    console.log("[boot] API routes mounted");
  } catch (err) {
    console.error("[boot] failed to mount API routes:", err);
  }

  // 3) Warm DB + bootstrap admin (non-blocking for health).
  try {
    const { prisma } = await import("./lib/prisma");
    const { bootstrapAdminFromEnv } = await import("./lib/bootstrapAdmin");
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log("[db] warm-up ok");
    } catch (err) {
      console.warn("[db] warm-up failed:", err);
    }
    try {
      await bootstrapAdminFromEnv();
    } catch (err) {
      console.error("[bootstrap] Failed:", err);
    }
  } catch (err) {
    console.error("[boot] post-listen init failed:", err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
