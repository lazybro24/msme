"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiPost, setSession, clearSession, type AuthUser } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { PasswordField } from "@/components/ui/PasswordField";
import { cn } from "@/lib/utils";

type LoginResult =
  | { authenticatorRequired: true; challengeId: string; message: string; email?: string }
  | { token: string; user: AuthUser; message?: string };

export function AuthLoginForm({
  title,
  subtitle,
  defaultEmail,
  redirectTo,
  homeHref = "/",
  requiredRoles,
}: {
  title: string;
  subtitle: string;
  defaultEmail: string;
  redirectTo: string;
  homeHref?: string;
  /** If set, login succeeds only when the user has one of these roles. */
  requiredRoles?: string[];
}) {
  const toast = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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

      const data = await apiPost<LoginResult>("/api/auth/login", { email, password }, false);

      if ("authenticatorRequired" in data && data.authenticatorRequired) {
        setAuthenticator({
          challengeId: data.challengeId,
          code: "",
          hint: data.message,
        });
        toast.push({
          title: "Account found",
          description: "Enter the 6-digit code from Google Authenticator",
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

  return (
    <div className="page-awards-bg page-awards-bg--cream flex min-h-screen items-center justify-center px-4 py-12">
      <div className="auth-form-card w-full max-w-md border border-black/10 p-6 sm:p-8">
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
          ) : (
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
              <PasswordField
                label="Password"
                required
                error={Boolean(error)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className={cn("btn-primary w-full", busy && "btn-loading")}
            disabled={busy}
          >
            {busy ? "Please wait…" : authenticator ? "Verify authenticator" : "Login"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-[#888]">
          Sign in with email and password. If MFA is enabled, Google Authenticator is required too.
        </p>
      </div>
    </div>
  );
}
