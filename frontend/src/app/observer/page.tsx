"use client";

import { useEffect, useState } from "react";
import { PortalShell, observerNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost } from "@/lib/api";

const integrityChecks = [
  "Rules applied consistently",
  "Conflict controls followed",
  "Evaluations completed",
  "Moderation documented",
  "Score calculations correct",
  "No unauthorized changes",
];

function ObserverInner() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [signed, setSigned] = useState(false);
  const [events, setEvents] = useState<
    { at: string; action: string; userName?: string; role?: string; applicationId?: string }[]
  >([]);
  const [ranks, setRanks] = useState<
    { rank: number; applicationId: string; org: string; finalScore: number }[]
  >([]);
  const [moderationCount, setModerationCount] = useState(0);
  const complete = integrityChecks.every((c) => checks[c]);

  useEffect(() => {
    apiGet<{ events: typeof events }>("/api/admin/audit").then((d) => setEvents(d.events.slice(0, 12)));
    apiGet<{ ranks: typeof ranks }>("/api/admin/rankings/MFG")
      .then((d) => setRanks(d.ranks))
      .catch(() => undefined);
    apiGet<{ moderationRequired: number }>("/api/admin/stats").then((d) =>
      setModerationCount(d.moderationRequired),
    );
  }, []);

  return (
    <PortalShell
      brand="Independent Process Observer"
      subtitle="Phase 3 · Read-only process assurance"
      nav={observerNav}
      userLabel="Observer · Read Only"
    >
      <div className="border border-black/10 bg-white p-5 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
          Does not choose winners
        </p>
        <h1 className="mt-2 font-display text-3xl font-black italic uppercase">
          Process Integrity Review
        </h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrityChecks.map((item) => (
            <label
              key={item}
              className="flex items-start gap-2 border border-black/10 bg-[#f7f4f2] px-3 py-3 text-sm"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={!!checks[item]}
                onChange={(e) => setChecks((p) => ({ ...p, [item]: e.target.checked }))}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        {signed ? (
          <div className="mt-6 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
            Observer attestation recorded · {new Date().toISOString()}
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary mt-6"
            disabled={!complete}
            onClick={async () => {
              try {
                await apiPost("/api/admin/observer-attestation", {
                  checks: integrityChecks.filter((c) => checks[c]),
                });
                setSigned(true);
              } catch (e) {
                alert(e instanceof Error ? e.message : "Failed");
              }
            }}
          >
            Record Observer Attestation
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-black/10 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-black italic uppercase">Audit Trail</h2>
          <ul className="mt-4 space-y-3">
            {events.map((e) => (
              <li key={e.at + e.action} className="border border-black/10 px-3 py-3 text-sm">
                <p className="font-medium">{e.action}</p>
                <p className="mt-1 text-xs text-[#888]">
                  {e.at} · {e.userName} ({e.role}) · {e.applicationId ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="border border-black/10 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-black italic uppercase">Ranking Snapshot</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {ranks.map((r) => (
                <li
                  key={r.applicationId}
                  className="flex justify-between border border-black/5 bg-[#f7f4f2] px-3 py-2"
                >
                  <span>
                    #{r.rank} {r.applicationId}
                  </span>
                  <span className="font-semibold">{r.finalScore}</span>
                </li>
              ))}
            </ul>
          </div>
          {moderationCount > 0 && (
            <div className="border border-amber-200 bg-amber-50 p-5">
              <p className="badge-warn">Open moderation cases: {moderationCount}</p>
              <p className="mt-2 text-sm text-[#555]">
                Details are available in the admin console for authorised staff.
              </p>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

export default function ObserverPage() {
  return (
    <AuthGate roles={["OBSERVER", "ADMINISTRATOR"]} loginPath="/observer/login">
      <ObserverInner />
    </AuthGate>
  );
}
