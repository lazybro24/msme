"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, setSession, type AuthUser } from "@/lib/api";

type RegisterStart = {
  otpRequired: true;
  purpose: "REGISTER";
  challengeId: string;
  message: string;
  demoOtp?: string;
  email: string;
};

export default function NominateRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState<{
    challengeId: string;
    code: string;
    hint: string;
  } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    try {
      if (otp) {
        const data = await apiPost<{ token: string; user: AuthUser }>(
          "/api/auth/verify-otp",
          { challengeId: otp.challengeId, code: otp.code, purpose: "REGISTER" },
          false,
        );
        setSession(data.token, data.user);
        router.push("/nominate/profile");
        return;
      }

      const password = String(fd.get("password"));
      const confirm = String(fd.get("confirm"));
      if (password !== confirm) {
        setError("Passwords do not match");
        setBusy(false);
        return;
      }

      const data = await apiPost<RegisterStart>(
        "/api/auth/register",
        {
          fullName: fd.get("fullName"),
          designation: fd.get("designation"),
          organisationName: fd.get("organisationName"),
          mobile: fd.get("mobile"),
          email: fd.get("email"),
          password,
        },
        false,
      );

      if (data.otpRequired) {
        setOtp({
          challengeId: data.challengeId,
          code: data.demoOtp || "",
          hint: data.message,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-awards-bg page-awards-bg--cream flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-black/10 bg-white p-6 sm:p-8">
        <Link
          href="/nominate"
          className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)] hover:underline"
        >
          ← Nomination
        </Link>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">
          {otp ? "Verify email" : "Create Account"}
        </h1>
        <p className="mt-2 text-sm text-[#666]">
          {otp
            ? "Enter the 6-digit code sent to your email to finish registration."
            : "After you submit, we'll email a one-time code to verify your address."}
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          {!otp ? (
            <>
              {[
                ["fullName", "Full Name"],
                ["designation", "Designation"],
                ["organisationName", "Business / Organisation Name"],
                ["mobile", "Mobile Number"],
                ["email", "Email Address"],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <input
                    className="input"
                    name={name}
                    required
                    type={name === "email" ? "email" : "text"}
                  />
                </div>
              ))}
              <div>
                <label className="label">Password</label>
                <input className="input" name="password" type="password" required minLength={8} />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input className="input" name="confirm" type="password" required minLength={8} />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" required className="mt-1" />
                I agree to the Privacy Policy and Terms of Use.
              </label>
            </>
          ) : (
            <div>
              <label className="label">Verification code</label>
              <input
                className="input"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp.code}
                onChange={(e) => setOtp({ ...otp, code: e.target.value })}
              />
              <p className="mt-2 text-xs text-[#888]">{otp.hint}</p>
            </div>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : otp ? "Verify & continue" : "Create Account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/nominate/login" className="font-semibold hover:underline">
            Already have an account? Login
          </Link>
        </p>
      </div>
    </div>
  );
}
