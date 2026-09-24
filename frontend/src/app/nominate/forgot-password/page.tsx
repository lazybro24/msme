"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [demoLink, setDemoLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setDemoLink("");
    try {
      const data = await apiPost<{
        message: string;
        demoResetLink?: string;
        demoResetToken?: string;
      }>("/api/auth/forgot-password", { email }, false);
      setMsg(data.message);
      if (data.demoResetLink) setDemoLink(data.demoResetLink);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-awards-bg page-awards-bg--cream flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-black/10 bg-white p-6 sm:p-8">
        <Link href="/nominate/login" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)] hover:underline">
          ← Back to login
        </Link>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">Forgot password</h1>
        <p className="mt-2 text-sm text-[#666]">Enter your account email. We will send a reset link.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-[#444]">{msg}</p>}
        {demoLink && (
          <p className="mt-2 break-all text-xs text-[var(--brand-gold-dark)]">
            Demo link: <Link href={demoLink}>{demoLink}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
