/**
 * Branded HTML email templates for Mysuru MSME Awards (Resend).
 */

const GOLD = "#e8a914";
const INK = "#1a1210";
const MUTED = "#666666";

export function brandShell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;background:#f4f1ea">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e6e0d6">
        <tr>
          <td style="background:#0d0507;padding:20px 24px">
            <div style="color:${GOLD};font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700">
              Mysuru MSME Awards 2026
            </div>
            <div style="margin-top:6px;color:#f7f4f2;font-size:13px;opacity:.85">
              Recognizing Excellence · Enabling Growth · Inspiring Tomorrow
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px">
            <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:${INK}">${escapeHtml(title)}</h1>
            <div style="font-size:15px;line-height:1.6;color:#333">${bodyHtml}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 22px;border-top:1px solid #efe9e3">
            <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED}">
              Awards Secretariat · Toya Corporate Consulting Services Pvt. Ltd.<br/>
              This is an automated message — please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function otpEmailTemplate(code: string, purposeLabel: string) {
  const title = "Your verification code";
  const text = `Your Mysuru MSME Awards verification code is ${code}.\n\nUse it to ${purposeLabel}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`;
  const html = brandShell(
    title,
    `<p style="margin:0 0 12px">Use this one-time code to <strong>${escapeHtml(purposeLabel)}</strong>.</p>
     <div style="margin:20px 0;padding:18px 16px;background:#0d0507;text-align:center;border-radius:2px">
       <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};font-weight:700;margin-bottom:8px">Verification code</div>
       <div style="font-size:32px;letter-spacing:.28em;font-weight:700;color:#ffffff;font-family:Consolas,Monaco,monospace">${escapeHtml(code)}</div>
     </div>
     <p style="margin:0 0 8px">This code expires in <strong>10 minutes</strong>.</p>
     <p style="margin:0;font-size:13px;color:${MUTED}">If you did not request this, you can safely ignore this email.</p>`,
  );
  return {
    subject: `Mysuru MSME Awards — verification code ${code}`,
    text,
    html,
  };
}

export function welcomeEmailTemplate(fullName: string, orgName: string | null | undefined, loginUrl: string) {
  const title = "Welcome to Mysuru MSME Awards 2026";
  const orgBit = orgName ? ` for ${orgName}` : "";
  const text = `Hi ${fullName},\n\nYour nomination account${orgBit} is ready.\nSign in: ${loginUrl}\n\n— Mysuru MSME Awards Secretariat`;
  const html = brandShell(
    "Welcome",
    `<p style="margin:0 0 12px">Hi <strong>${escapeHtml(fullName)}</strong>,</p>
     <p style="margin:0 0 16px">Your nomination account${orgName ? ` for <strong>${escapeHtml(orgName)}</strong>` : ""} is ready. Complete your profile and submit your application when you’re prepared.</p>
     <p style="margin:0 0 20px">
       <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:${GOLD};color:${INK};text-decoration:none;padding:12px 18px;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase">Sign in to continue</a>
     </p>
     <p style="margin:0;font-size:13px;color:${MUTED}">Or open: ${escapeHtml(loginUrl)}</p>`,
  );
  return { subject: title, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
