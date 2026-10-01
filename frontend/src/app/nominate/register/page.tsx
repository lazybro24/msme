"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, setSession, type AuthUser } from "@/lib/api";
import { PasswordField } from "@/components/ui/PasswordField";

type RegisterResult = {
  token: string;
  user: AuthUser;
  message?: string;
};

export default function NominateRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    try {
      const password = String(fd.get("password"));
      const confirm = String(fd.get("confirm"));
      if (password !== confirm) {
        setError("Passwords do not match");
        setBusy(false);
        return;
      }

      const data = await apiPost<RegisterResult>(
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

      setSession(data.token, data.user);
      router.push("/nominate/profile");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-awards-bg page-awards-bg--cream flex min-h-screen items-center justify-center px-4 py-12">
      <div className="auth-form-card w-full max-w-md border border-black/10 p-6 sm:p-8">
        <Link
          href="/nominate"
          className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)] hover:underline"
        >
          ← Nomination
        </Link>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">Create Account</h1>
        <p className="mt-2 text-sm text-[#666]">
          Register with your email and password. If an account already exists, you will be asked to
          log in instead.
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
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
          <PasswordField
            label="Password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            error={Boolean(error)}
          />
          <PasswordField
            label="Confirm Password"
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            error={Boolean(error)}
          />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required className="mt-1" />
            I agree to the Privacy Policy and Terms of Use.
          </label>
          {error && (
            <p className="text-sm text-red-700">
              {error}
              {/already exists/i.test(error) ? (
                <>
                  {" "}
                  <Link href="/nominate/login" className="font-semibold underline">
                    Go to login
                  </Link>
                </>
              ) : null}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : "Create Account"}
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
