import { Router } from "express";
import { prisma } from "../lib/prisma";
import { storageMode } from "../lib/storage";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let database: "up" | "down" = "down";
  try {
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

  // Always 200 so Railway keeps routing; clients use `ok` / `database`.
  res.status(200).json({
    ok: database === "up",
    service: "mysuru-msme-awards-backend",
    database,
    storage: storageMode(),
    time: new Date().toISOString(),
  });
});
