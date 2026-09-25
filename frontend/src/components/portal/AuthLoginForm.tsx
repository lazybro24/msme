"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiPost, setSession, clearSession, type AuthUser } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type LoginStart =
  | {
      otpRequired: true;
      purpose: "LOGIN" | "REGISTER";
      challengeId: string;
      message: string;
      demoOtp?: string;
      email?: string;
    }
  | { token: string; user: AuthUser };

type OtpVerifyResult =
  | { authenticatorRequired: true; challengeId: string; message: string; email?: string }
  | { token: string; user: AuthUser };

export function AuthLoginForm({
  title,
  subtitle,
  defaultEmail,
  redirectTo,
  homeHref = "/",
  forgotHref = "/nominate/forgot-password",
  requiredRoles,
}: {
  title: string;
  subtitle: string;
  defaultEmail: string;
  redirectTo: string;
  homeHref?: string;
  forgotHref?: string;
  /** If set, login succeeds only when the user has one of these roles. */
  requiredRoles?: string[];
}) {
  const toast = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState<{
    challengeId: string;
    code: string;
    hint: string;
    purpose: "LOGIN" | "REGISTER";
  } | null>(null);
  const [authenticator, setAuthenticator] = useState<{
    challengeId: string;
    code: string;
    hint: string;
  } | null>(null);

  async function finishLogin(token: string, user: AuthUser) {
    if (requiredRoles?.length && !requiredRoles.some((r) => user.roles.includes(r))) {
      clearSession();
      throw new Error("This portal is for authorised admin accounts only.");
    }
    setSession(token, user);
    toast.push({
      title: "Signed in",
      description: `Welcome, ${user.fullName}`,
      tone: "success",
    });
    // Hard navigate so the login screen unloads immediately (soft router.push feels stuck
    // while the dashboard waits on Neon / multiple API calls).
    window.location.assign(redirectTo);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (authenticator) {
        const data = await apiPost<{ token: string; user: AuthUser }>(
          "/api/auth/verify-totp",
          { challengeId: authenticator.challengeId, code: authenticator.code },
          false,
        );
        await finishLogin(data.token, data.user);
        return;
      }

      if (otp) {
        const data = await apiPost<OtpVerifyResult>(
          "/api/auth/verify-otp",
          { challengeId: otp.challengeId, code: otp.code, purpose: otp.purpose },
          false,
        );
        if ("authenticatorRequired" in data && data.authenticatorRequired) {
          setAuthenticator({
            challengeId: data.challengeId,
            code: "",
            hint: data.message,
          });
          setOtp(null);
          toast.push({
            title: "Google Authenticator",
            description: "Enter the 6-digit code from your authenticator app",
            tone: "info",
          });
          setBusy(false);
          return;
        }
        if ("token" in data) {
          await finishLogin(data.token, data.user);
        }
        return;
      }

      const data = await apiPost<LoginStart>("/api/auth/login", { email, password }, false);

      if ("otpRequired" in data && data.otpRequired) {
        setOtp({
          challengeId: data.challengeId,
          code: data.demoOtp || "",
          hint: data.message,
          purpose: data.purpose || "LOGIN",
        });
        toast.push({
          title: "Check your email",
          description: data.demoOtp
            ? `Local demo code: ${data.demoOtp}`
            : "Enter the verification code we emailed you",
          tone: "info",
        });
        setBusy(false);
        return;
      }

      if ("token" in data) {
        await finishLogin(data.token, data.user);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast.push({ title: "Login failed", description: message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!otp) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiPost<{
        challengeId: string;
        message: string;
        demoOtp?: string;
        purpose: "LOGIN" | "REGISTER";
      }>("/api/auth/resend-otp", { challengeId: otp.challengeId }, false);
      setOtp({
        challengeId: data.challengeId,
        code: data.demoOtp || "",
        hint: data.message,
        purpose: data.purpose || otp.purpose,
      });
      toast.push({
        title: "Code resent",
        description: data.demoOtp ? `Demo code: ${data.demoOtp}` : data.message,
        tone: "info",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend");
    } finally {
      setBusy(false);
    }
  }

  const stepLabel = authenticator
    ? "Verify authenticator"
    : otp
      ? "Verify & continue"
      : "Login";

  return (
    <div className="page-awards-bg page-awards-bg--cream flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-black/10 bg-white p-6 sm:p-8">
        <Link
          href={homeHref}
          className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)] hover:underline"
        >
          ← Home
        </Link>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">{title}</h1>
        <p className="mt-2 text-sm text-[#666]">{subtitle}</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {authenticator ? (
            <div>
              <label className="label">Google Authenticator code</label>
              <input
                className={cn("input font-mono tracking-[0.2em]", error && "input-error")}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="000000"
                value={authenticator.code}
                onChange={(e) =>
                  setAuthenticator({
                    ...authenticator,
                    code: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
              />
              <p className="mt-2 text-xs text-[#888]">{authenticator.hint}</p>
            </div>
          ) : !otp ? (
            <>
              <div>
                <label className="label">Email</label>
                <input
                  className={cn("input", error && "input-error")}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className={cn("input", error && "input-error")}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="label">Email verification code</label>
              <input
                className={cn("input", error && "input-error")}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp.code}
                onChange={(e) => setOtp({ ...otp, code: e.target.value })}
              />
              <p className="mt-2 text-xs text-[#888]">{otp.hint}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-[var(--brand-gold-dark)] underline-offset-2 hover:underline"
                onClick={resend}
                disabled={busy}
              >
                Resend code
              </button>
            </div>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className={cn("btn-primary w-full", busy && "btn-loading")}
            disabled={busy}
          >
            {busy ? "Please wait…" : stepLabel}
          </button>
        </form>
        {!otp && !authenticator && (
          <p className="mt-3 text-center text-sm">
            <Link
              href={forgotHref}
              className="text-[var(--brand-gold-dark)] underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        )}
        <p className="mt-4 text-center text-xs text-[#888]">
          Password + email OTP required. If MFA is enabled, Google Authenticator is required too.
        </p>
      </div>
    </div>
  );
}
