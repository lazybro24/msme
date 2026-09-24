"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { apiPost } from "@/lib/api";

function ResetInner() {
  const search = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => search.get("token") || "", [search]);
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const data = await apiPost<{ message: string }>(
        "/api/auth/reset-password",
        { token, newPassword },
        false,
      );
      setMsg(data.message);
      setTimeout(() => router.push("/nominate/login"), 1200);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-awards-bg page-awards-bg--cream flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-black/10 bg-white p-6 sm:p-8">
        <Link href="/nominate/login" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)] hover:underline">
          ← Login
        </Link>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">Reset password</h1>
        {!token ? (
          <p className="mt-4 text-sm text-red-700">Missing reset token. Use the link from your email.</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
        {msg && <p className="mt-4 text-sm">{msg}</p>}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading…</div>}>
      <ResetInner />
    </Suspense>
  );
}
