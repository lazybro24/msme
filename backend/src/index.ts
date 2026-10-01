import "dotenv/config";

const port = Number(process.env.PORT || 4000);

async function main() {
  // Import app only — no Prisma — so we bind the port immediately for Railway.
  const { createApp } = await import("./app");
  const app = createApp();

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Mysuru MSME Awards API listening on 0.0.0.0:${port}`);
      console.log(`Health: http://0.0.0.0:${port}/api/health`);
      resolve();
    });
    server.on("error", reject);

    process.on("SIGTERM", () => {
      console.log("[server] SIGTERM");
      server.close(() => process.exit(0));
    });
  });

  setInterval(() => {}, 60_000);

  process.on("uncaughtException", (err) => {
    console.error("[server] uncaughtException:", err);
  });
  process.on("unhandledRejection", (err) => {
    console.error("[server] unhandledRejection:", err);
  });

  // DB warm-up + admin bootstrap after port is open
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
