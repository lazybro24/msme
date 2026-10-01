import crypto from "crypto";
import dns from "dns";
import { promisify } from "util";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const lookup4 = promisify(dns.lookup);

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 8000);

export function smtpConfigured() {
  const host = process.env.SMTP_HOST?.trim() || "";
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from = process.env.SMTP_FROM?.trim() || "";
  if (!host || !user || !pass || !from) return false;
  const placeholders = ["your@gmail.com", "your-app-password", "changeme", "example.com"];
  if (placeholders.some((p) => user.includes(p) || pass.includes(p) || from.includes(p))) {
    return false;
  }
  return true;
}

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** True if any email provider is ready (Resend HTTP or Gmail SMTP). */
export function mailConfigured() {
  return resendConfigured() || smtpConfigured();
}

/** When SMTP is missing or broken in non-production, allow returning OTP/reset codes in API. */
export function allowDevMailCodes() {
  if (process.env.NODE_ENV === "production" && process.env.OTP_DEV_EXPOSE !== "true") {
    return false;
  }
  return process.env.OTP_DEV_EXPOSE !== "false";
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

/** Resend HTTP API — works on Railway when outbound SMTP ports are blocked. */
async function sendViaResend(input: SendMailInput): Promise<void> {
  const key = process.env.RESEND_API_KEY!.trim();
  const from = process.env.SMTP_FROM?.trim() || process.env.RESEND_FROM?.trim();
  if (!from) throw new Error("SMTP_FROM (or RESEND_FROM) required for Resend");

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
    SMTP_TIMEOUT_MS,
    "Resend API",
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
  console.info("[mail] sent via Resend →", input.to);
}

async function createIpv4Transporter(port: number) {
  const hostname = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const { address } = await lookup4(hostname, { family: 4 });

  const options: SMTPTransport.Options = {
    host: address,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    requireTLS: port === 587,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    tls: {
      servername: hostname,
      rejectUnauthorized: true,
    },
    name: hostname,
  };

  console.info(`[mail] SMTP trying IPv4 ${address}:${port} (${hostname})`);
  return nodemailer.createTransport(options);
}

async function sendViaSmtp(input: SendMailInput): Promise<void> {
  const preferred = Number(process.env.SMTP_PORT || 587);
  // Try preferred port, then the other common Gmail port (Railway often blocks 587).
  const ports = [...new Set([preferred, preferred === 465 ? 587 : 465])];
  let lastErr: unknown;

  for (const port of ports) {
    try {
      const tx = await createIpv4Transporter(port);
      await withTimeout(
        tx.sendMail({
          from: process.env.SMTP_FROM,
          to: input.to,
          subject: input.subject,
          text: input.text,
          html:
            input.html ??
            `<p style="font-family:Arial,sans-serif;line-height:1.5">${input.text.replace(/\n/g, "<br/>")}</p>`,
        }),
        SMTP_TIMEOUT_MS + 2000,
        `SMTP :${port}`,
      );
      console.info(`[mail] sent via SMTP :${port} →`, input.to);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `[mail] SMTP :${port} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("SMTP send failed");
}

export async function sendMail(
  input: SendMailInput,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!mailConfigured()) {
    console.info("[mail] no provider configured — skipped:", input.subject, "→", input.to);
    return { sent: false, skipped: "Email not configured" };
  }

  const errors: string[] = [];

  // Prefer Resend on Railway (HTTPS) — avoids blocked SMTP ports.
  if (resendConfigured()) {
    try {
      await sendViaResend(input);
      return { sent: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Resend failed";
      console.error("[mail] Resend failed:", message);
      errors.push(message);
    }
  }

  if (smtpConfigured()) {
    try {
      await sendViaSmtp(input);
      return { sent: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "SMTP send failed";
      console.error("[mail] SMTP failed:", message);
      errors.push(message);
    }
  }

  return {
    sent: false,
    error: errors.join(" | ") || "Email send failed",
  };
}

import {
  brandShell,
  otpEmailTemplate,
  passwordResetEmailTemplate,
  welcomeEmailTemplate,
} from "./emailTemplates";

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

export async function sendPasswordResetMail(to: string, fullName: string, link: string) {
  const tpl = passwordResetEmailTemplate(fullName, link);
  return sendMail({ to, ...tpl });
}

export function hashOtp(code: string) {
  const salt = process.env.AUTH_SECRET || "msme-otp";
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}
