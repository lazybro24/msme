"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SimpleLogin({
  title,
  subtitle,
  redirectTo,
}: {
  title: string;
  subtitle: string;
  redirectTo: string;
  demoEmail?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    router.push(redirectTo);
  }

  return (
    <div className="page-awards-bg page-awards-bg--cream flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-black/10 bg-white p-6 sm:p-8">
        <Link
          href="/"
          className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)] hover:underline"
        >
          ← Home
        </Link>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">{title}</h1>
        <p className="mt-2 text-sm text-[#666]">{subtitle}</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
