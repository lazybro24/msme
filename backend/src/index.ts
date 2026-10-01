import "dotenv/config";
import { createApp } from "./app";
import { bootstrapAdminFromEnv } from "./lib/bootstrapAdmin";
import { prisma } from "./lib/prisma";

const port = Number(process.env.PORT || 4000);

async function main() {
  console.log("[boot] PORT=", process.env.PORT || 4000);
  console.log("[boot] NODE_ENV=", process.env.NODE_ENV);
  console.log(
    "[boot] DB host=",
    (process.env.DIRECT_URL || process.env.DATABASE_URL || "")
      .replace(/:[^:@/]+@/, ":****@")
      .slice(0, 120),
  );

  // Warm Neon in background — never block listen
  void (async () => {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log("[db] warm-up ok");
    } catch (err) {
      console.warn("[db] warm-up failed (will retry on first request):", err);
    }
  })();

  void bootstrapAdminFromEnv().catch((err) => {
    console.error("[bootstrap] Failed:", err);
  });

  const app = createApp();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Mysuru MSME Awards API listening on 0.0.0.0:${port}`);
    console.log(`Health: http://0.0.0.0:${port}/api/health`);
  });

  server.on("error", (err) => {
    console.error("[server] listen error:", err);
    process.exit(1);
  });

  setInterval(() => {}, 60_000);

  process.on("SIGTERM", () => {
    console.log("[server] SIGTERM — shutting down");
    server.close(() => process.exit(0));
  });
  process.on("uncaughtException", (err) => {
    console.error("[server] uncaughtException:", err);
  });
  process.on("unhandledRejection", (err) => {
    console.error("[server] unhandledRejection:", err);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
