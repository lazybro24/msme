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
  // Always 200 so Railway keeps the process up; clients check `ok` / `database`.
  res.status(200).json({
    ok,
    service: "mysuru-msme-awards-backend",
    database,
    storage: storageMode(),
    time: new Date().toISOString(),
  });
});
