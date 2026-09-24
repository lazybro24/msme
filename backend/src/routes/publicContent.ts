import { Router } from "express";
import { prisma } from "../lib/prisma";

/** Public platform flags only (CMS removed). */
export const publicContentRouter = Router();

publicContentRouter.get("/settings", async (_req, res) => {
  const rows = await prisma.siteSetting.findMany();
  const settings: Record<string, unknown> = {
    nominationsOpen: true,
    registrationOpen: true,
  };
  for (const row of rows) settings[row.key] = row.value;
  res.json({ settings });
});
