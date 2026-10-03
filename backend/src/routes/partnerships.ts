import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const partnershipsRouter = Router();

const schema = z.object({
  name: z.string().min(2),
  organisation: z.string().min(2),
  designation: z.string().optional(),
  email: z.string().email(),
  mobile: z.string().min(8),
  industry: z.string().optional(),
  interest: z.string().min(2),
  message: z.string().min(5),
});

partnershipsRouter.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const item = await prisma.partnershipRequest.create({ data: parsed.data });
    return res.status(201).json({ item, source: "database" });
  } catch (err) {
    console.error("[partnerships] create failed:", err);
    return res.status(503).json({ error: "Unable to save partnership request. Please try again shortly." });
  }
});
