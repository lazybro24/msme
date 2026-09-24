import crypto from "crypto";
import nodemailer from "nodemailer";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function smtpConfigured() {
  const host = process.env.SMTP_HOST?.trim() || "";
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from = process.env.SMTP_FROM?.trim() || "";
  if (!host || !user || !pass || !from) return false;
  // Ignore common placeholders so registration isn't blocked
  const placeholders = ["your@gmail.com", "your-app-password", "changeme", "example.com"];
  if (placeholders.some((p) => user.includes(p) || pass.includes(p) || from.includes(p))) {
    return false;
  }
  return true;
}

/** When SMTP is missing or broken in non-production, allow returning OTP/reset codes in API. */
export function allowDevMailCodes() {
  if (process.env.NODE_ENV === "production" && process.env.OTP_DEV_EXPOSE !== "true") {
    return false;
  }
  return process.env.OTP_DEV_EXPOSE !== "false";
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMail(
  input: SendMailInput,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!smtpConfigured()) {
    console.info("[mail] SMTP not configured — skipped:", input.subject, "→", input.to);
    return { sent: false, skipped: "SMTP not configured" };
  }

  try {
    await transporter().sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<p style="font-family:Arial,sans-serif;line-height:1.5">${input.text.replace(/\n/g, "<br/>")}</p>`,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP send failed";
    console.error("[mail] send failed:", message);
    return { sent: false, error: message };
  }
}

export function brandMailHtml(title: string, bodyHtml: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1a1210">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e6e0d6">
        <tr><td style="background:#0d0507;padding:18px 24px;color:#e8a914;font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">
          Mysuru MSME Awards 2026
        </td></tr>
        <tr><td style="padding:28px 24px">
          <h1 style="margin:0 0 12px;font-size:22px;color:#1a1210">${title}</h1>
          <div style="font-size:15px;line-height:1.55;color:#333">${bodyHtml}</div>
          <p style="margin:28px 0 0;font-size:12px;color:#888">— Awards Secretariat · Toya Corporate Consulting Services</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendOtpMail(to: string, code: string, purpose: string) {
  const label =
    purpose === "REGISTER"
      ? "complete registration"
      : purpose === "LOGIN"
        ? "sign in"
        : "verify your request";
  const text = `Your Mysuru MSME Awards verification code is ${code}.\n\nUse it to ${label}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`;
  return sendMail({
    to,
    subject: `Mysuru MSME Awards — verification code ${code}`,
    text,
    html: brandMailHtml(
      "Email verification",
      `<p>Your verification code is:</p>
       <p style="font-size:28px;letter-spacing:.2em;font-weight:700;color:#1a1210;margin:16px 0">${code}</p>
       <p>Use it to ${label}. It expires in <strong>10 minutes</strong>.</p>
       <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>`,
    ),
  });
}

export async function sendWelcomeMail(to: string, fullName: string, orgName?: string | null) {
  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";
  const text = `Hi ${fullName},\n\nYour nomination account${orgName ? ` for ${orgName}` : ""} is ready.\nSign in: ${origin}/nominate/login\n\n— Mysuru MSME Awards Secretariat`;
  return sendMail({
    to,
    subject: "Welcome to Mysuru MSME Awards 2026",
    text,
    html: brandMailHtml(
      "Welcome",
      `<p>Hi ${fullName},</p>
       <p>Your nomination account${orgName ? ` for <strong>${orgName}</strong>` : ""} is ready.</p>
       <p><a href="${origin}/nominate/login" style="color:#b8860b">Sign in to continue</a></p>`,
    ),
  });
}

export async function sendPasswordResetMail(to: string, fullName: string, link: string) {
  const text = `Hi ${fullName},\n\nReset your password (valid 1 hour):\n${link}\n\nIf you did not request this, ignore this email.`;
  return sendMail({
    to,
    subject: "Reset your Mysuru MSME Awards password",
    text,
    html: brandMailHtml(
      "Password reset",
      `<p>Hi ${fullName},</p>
       <p>Click below to reset your password (valid for 1 hour):</p>
       <p><a href="${link}" style="display:inline-block;background:#e8a914;color:#1a0c10;text-decoration:none;padding:10px 16px;font-weight:700">Reset password</a></p>
       <p style="font-size:12px;color:#666;word-break:break-all">${link}</p>`,
    ),
  });
}

export function hashOtp(code: string) {
  const salt = process.env.AUTH_SECRET || "msme-otp";
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}
