import crypto from "crypto";
import {
  brandShell,
  otpEmailTemplate,
  welcomeEmailTemplate,
} from "./emailTemplates";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const RESEND_TIMEOUT_MS = Number(process.env.RESEND_TIMEOUT_MS || 12000);
const DEFAULT_RESEND_FROM = "Mysuru MSME Awards <onboarding@resend.dev>";

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function mailConfigured() {
  return resendConfigured();
}

export function allowDevMailCodes() {
  if (process.env.NODE_ENV === "production" && process.env.OTP_DEV_EXPOSE !== "true") {
    return false;
  }
  return process.env.OTP_DEV_EXPOSE !== "false";
}

function resendFromAddress() {
  const raw = (process.env.RESEND_FROM || "").trim();
  if (!raw || /@gmail\.com>/i.test(raw) || /@gmail\.com$/i.test(raw)) {
    return DEFAULT_RESEND_FROM;
  }
  return raw;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function sendViaResend(input: SendMailInput): Promise<void> {
  const key = process.env.RESEND_API_KEY!.trim();
  const from = resendFromAddress();

  const res = await withTimeout(
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html:
          input.html ??
          `<p style="font-family:Arial,sans-serif;line-height:1.5">${input.text.replace(/\n/g, "<br/>")}</p>`,
      }),
    }),
    RESEND_TIMEOUT_MS,
    "Resend API",
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 280)}`);
  }
  console.info("[mail] sent via Resend →", input.to, "from", from);
}

export async function sendMail(
  input: SendMailInput,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!resendConfigured()) {
    console.info("[mail] RESEND_API_KEY missing — skipped:", input.subject, "→", input.to);
    return { sent: false, skipped: "RESEND_API_KEY not set" };
  }

  try {
    await sendViaResend(input);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend failed";
    console.error("[mail] Resend failed:", message);
    return { sent: false, error: message };
  }
}

export function brandMailHtml(title: string, bodyHtml: string) {
  return brandShell(title, bodyHtml);
}

export async function sendOtpMail(to: string, code: string, purpose: string) {
  const label =
    purpose === "REGISTER"
      ? "complete registration"
      : purpose === "LOGIN"
        ? "sign in"
        : "verify your request";
  const tpl = otpEmailTemplate(code, label);
  return sendMail({ to, ...tpl });
}

export async function sendWelcomeMail(to: string, fullName: string, orgName?: string | null) {
  const origin = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",")[0]!.trim();
  const tpl = welcomeEmailTemplate(fullName, orgName, `${origin}/nominate/login`);
  return sendMail({ to, ...tpl });
}

export function hashOtp(code: string) {
  const salt = process.env.AUTH_SECRET || "msme-otp";
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}
