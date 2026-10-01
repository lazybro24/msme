import { Router } from "express";

export const healthRouter = Router();

/** Liveness only — zero deps beyond Express (Railway healthcheck). */
healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "mysuru-msme-awards-backend",
    time: new Date().toISOString(),
  });
});

healthRouter.get("/ready", async (_req, res) => {
  let database: "up" | "down" = "down";
  try {
    const { prisma } = await import("../lib/prisma");
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("db health timeout")), 2500);
      }),
    ]);
    database = "up";
  } catch {
    database = "down";
  }
  res.status(200).json({
    ok: database === "up",
    database,
    time: new Date().toISOString(),
  });
});
