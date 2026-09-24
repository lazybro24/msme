import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";

const ISSUER = process.env.MFA_ISSUER || "Mysuru MSME Awards";

/** Real TOTP secrets are Base32 and reasonably long (not legacy demo stubs). */
export function isRealTotpSecret(secret?: string | null) {
  if (!secret) return false;
  const s = secret.replace(/\s+/g, "");
  return s.length >= 16 && /^[A-Z2-7]+=*$/i.test(s);
}

export async function createTotpSecret() {
  return generateSecret();
}

export async function buildOtpauthUrl(email: string, secret: string) {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export async function buildQrDataUrl(otpauthUrl: string) {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: { dark: "#1a0c10", light: "#ffffff" },
  });
}

export async function verifyTotpCode(secret: string, code: string) {
  const cleaned = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  if (!isRealTotpSecret(secret)) return false;
  try {
    const result = await verify({ secret, token: cleaned });
    return Boolean(result && typeof result === "object" && "valid" in result && result.valid);
  } catch {
    return false;
  }
}
