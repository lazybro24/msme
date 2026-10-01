import "dotenv/config";
import { createApp } from "./app";
import { bootstrapAdminFromEnv } from "./lib/bootstrapAdmin";
import { prisma } from "./lib/prisma";

const port = Number(process.env.PORT || 4000);

async function main() {
  // Warm Neon connection so the first login isn't stuck on cold start
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.warn("[db] warm-up failed (will retry on first request):", err);
  }

  try {
    await bootstrapAdminFromEnv();
  } catch (err) {
    console.error("[bootstrap] Failed:", err);
  }

  const app = createApp();
  // Bind all interfaces. Railway proxies to process.env.PORT.
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Mysuru MSME Awards API listening on 0.0.0.0:${port}`);
    console.log(`Health: http://0.0.0.0:${port}/api/health`);
  });

  server.on("error", (err) => {
    console.error("[server] listen error:", err);
    process.exit(1);
  });

  // Keep event loop alive even if pools go quiet (defense in depth on Railway).
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
