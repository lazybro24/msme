import { Router } from "express";
import { prisma } from "../lib/prisma";
import { storageMode } from "../lib/storage";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  const ok = database === "up";
  res.status(ok ? 200 : 503).json({
    ok,
    service: "mysuru-msme-awards-backend",
    database,
    storage: storageMode(),
    time: new Date().toISOString(),
  });
});
