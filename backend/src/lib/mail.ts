/**
 * Outbound email via Resend (preferred) when RESEND_API_KEY is set.
 * SMTP_* vars are reserved for a future transport — not used yet.
 */

type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

function fromAddress() {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    "Mysuru MSME Awards <onboarding@resend.dev>"
  );
}

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[mail] RESEND_API_KEY not set — skipping email:", input.subject);
    }
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!to.length) return { ok: false, error: "No recipients" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to,
        subject: input.subject,
        text: input.text,
        html: input.html || `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[mail] Resend error:", res.status, body);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[mail] send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
