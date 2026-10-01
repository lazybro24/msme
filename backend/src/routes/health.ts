import { Router } from "express";
import { storageMode } from "../lib/storage";

export const healthRouter = Router();

/** Liveness only — never touches DB (avoids Railway 502 when Neon is slow). */
healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "mysuru-msme-awards-backend",
    storage: storageMode(),
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
