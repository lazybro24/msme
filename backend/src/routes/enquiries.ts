import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

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
    const inbox = process.env.MAIL_INBOX?.trim() || process.env.SMTP_FROM?.trim();
    if (inbox) {
      try {
        const { sendEmail } = await import("../lib/mail");
        void sendEmail({
          to: inbox,
          subject: `[Enquiry] ${parsed.data.nature} — ${parsed.data.fullName}`,
          text: [
            `Name: ${parsed.data.fullName}`,
            `Email: ${parsed.data.email}`,
            `Mobile: ${parsed.data.mobile}`,
            `Organisation: ${parsed.data.organisation || "—"}`,
            `Nature: ${parsed.data.nature}`,
            "",
            parsed.data.message,
          ].join("\n"),
        });
      } catch {
        /* non-blocking */
      }
    }
    return res.status(201).json({ item, source: "database" });
  } catch (err) {
    console.error("[enquiries] create failed:", err);
    return res.status(503).json({ error: "Unable to save enquiry. Please try again shortly." });
  }
});
