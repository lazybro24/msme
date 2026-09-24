import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { store } from "../lib/store";

export const enquiriesRouter = Router();

const enquirySchema = z.object({
  fullName: z.string().min(2),
  organisation: z.string().optional(),
  designation: z.string().optional(),
  mobile: z.string().min(8),
  email: z.string().email(),
  nature: z.enum([
    "NOMINATION_SUPPORT",
    "ELIGIBILITY_QUESTION",
    "PARTNERSHIP",
    "EVENT_PARTICIPATION",
    "MEDIA_PR",
    "JURY_INSTITUTIONAL",
    "OTHER",
  ]),
  message: z.string().min(5),
});

enquiriesRouter.post("/", async (req, res) => {
  const parsed = enquirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const item = await prisma.enquiry.create({ data: parsed.data });
    return res.status(201).json({ item, source: "database" });
  } catch {
    const item = { id: store.id(), ...parsed.data, createdAt: store.now() };
    store.enquiries.unshift(item);
    return res.status(201).json({ item, source: "memory" });
  }
});
