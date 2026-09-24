"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalShell, juryNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost, getStoredUser, getToken, setSession, type AuthUser } from "@/lib/api";

const pledges = [
  "Evaluate independently",
  "Maintain confidentiality",
  "Disclose conflicts",
  "Use evidence-based judgment",
  "Avoid applicant contact regarding evaluation",
  "Reject gifts or inducements",
  "Protect confidential information",
  "Not share scores",
  "Follow the approved scoring framework",
];

export default function ConductPage() {
  return (
    <AuthGate roles={["JURY", "JURY_CHAIR", "ADMINISTRATOR"]} loginPath="/jury-portal/login">
      <ConductInner />
    </AuthGate>
  );
}

function ConductInner() {
  const stored = getStoredUser();
  const [user, setUser] = useState<AuthUser | null>(stored);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const acceptedAt = user?.conductAcceptedAt ?? null;

  useEffect(() => {
    apiGet<{ user: AuthUser }>("/api/auth/me")
      .then((d) => {
        setUser(d.user);
        const token = getToken();
        if (token) setSession(token, d.user);
      })
      .catch(() => undefined);
  }, []);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const res = await apiPost<{ user: AuthUser; message: string }>("/api/auth/me/conduct", {});
      setUser(res.user);
      const token = getToken();
      if (token) setSession(token, res.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save acceptance");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      brand="Jury Portal"
      subtitle="Jury Code of Conduct"
      nav={juryNav}
      userLabel={user?.fullName ?? "Jury Member"}
    >
      <div className="border border-black/10 bg-white p-5 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
          Required before scoring
        </p>
        <h1 className="mt-2 font-display text-3xl font-black italic uppercase">
          Digital Acceptance
        </h1>
        <p className="mt-2 text-sm text-[#666]">
          Every juror must accept before evaluating applications. Acceptance is saved to your
          account.
        </p>
        <ul className="mt-6 space-y-2">
          {pledges.map((p) => (
            <li key={p} className="border border-black/5 bg-[#f7f4f2] px-3 py-2 text-sm">
              I will {p.charAt(0).toLowerCase() + p.slice(1)}.
            </li>
          ))}
        </ul>
        {error && (
          <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {acceptedAt ? (
          <div className="mt-6 space-y-3">
            <div className="border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
              Accepted · {new Date(acceptedAt).toLocaleString()}
            </div>
            <Link href="/jury-portal" className="btn-primary">
              Continue to Assignments
            </Link>
          </div>
        ) : (
          <button type="button" className="btn-primary mt-6" disabled={busy} onClick={accept}>
            {busy ? "Saving…" : "Accept Code of Conduct"}
          </button>
        )}
      </div>
    </PortalShell>
  );
}
