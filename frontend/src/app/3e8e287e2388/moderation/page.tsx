"use client";

import { useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost } from "@/lib/api";

type Agg = {
  scores: { judge: string; score: number }[];
  average: number;
  median: number;
  highest: number;
  lowest: number;
  variance: number;
  moderationRequired: boolean;
};

function ModerationInner() {
  const [appId, setAppId] = useState("MMA26-SRV-0044");
  const [agg, setAgg] = useState<Agg | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiGet<{ aggregation: Agg | null }>(`/api/evaluations/${appId}/aggregation`)
      .then((d) => setAgg(d.aggregation))
      .catch(() => setAgg(null));
  }, [appId]);

  return (
    <PortalShell
      brand="Secretariat"
      subtitle="Jury Chair · Moderation Panel"
      nav={secretariatNav}
      userLabel="Jury Chair"
    >
      <div className="border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <p className="badge-warn">⚠ Moderation Required</p>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">{appId}</h1>
        <p className="mt-1 text-sm text-[#555]">
          Auto-triggered when independent score spread exceeds 20 points.
        </p>
        <div className="mt-3">
          <label className="label">Application</label>
          <select className="input max-w-xs" value={appId} onChange={(e) => setAppId(e.target.value)}>
            <option value="MMA26-SRV-0044">MMA26-SRV-0044</option>
            <option value="MMA26-MFG-0047">MMA26-MFG-0047</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-black/10 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-black italic uppercase">Independent Scores</h2>
          <ul className="mt-4 space-y-3">
            {(agg?.scores ?? []).map((s) => (
              <li key={s.judge} className="border border-black/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{s.judge}</span>
                  <span className="font-display text-2xl font-black italic">{s.score}</span>
                </div>
              </li>
            ))}
            {!agg && <li className="text-sm text-[#666]">No locked evaluations yet.</li>}
          </ul>
          {agg && (
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-[#f7f4f2] px-2 py-3">
                <dt className="text-[10px] font-bold uppercase text-[#888]">High</dt>
                <dd className="font-bold">{agg.highest}</dd>
              </div>
              <div className="bg-[#f7f4f2] px-2 py-3">
                <dt className="text-[10px] font-bold uppercase text-[#888]">Low</dt>
                <dd className="font-bold">{agg.lowest}</dd>
              </div>
              <div className="bg-[#f7f4f2] px-2 py-3">
                <dt className="text-[10px] font-bold uppercase text-[#888]">Spread</dt>
                <dd className="font-bold text-amber-800">{agg.variance}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="border border-black/10 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-black italic uppercase">Panel Decision</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Request independent reconsider",
              "Clarify evidence package",
              "Accept variance (document)",
              "Escalate to Jury Chair",
            ].map((o) => (
              <button
                key={o}
                type="button"
                className={`px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] ${
                  outcome === o ? "bg-black text-white" : "bg-[#f7f4f2]"
                }`}
                onClick={() => setOutcome(o)}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="label">Moderation notes (audit logged)</label>
            <textarea
              className="input min-h-28"
              placeholder="Document findings..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary mt-4"
            disabled={!outcome}
            onClick={async () => {
              try {
                await apiPost(`/api/admin/moderation/${appId}`, {
                  decision: outcome,
                  notes,
                });
                setMsg(`Decision recorded: ${outcome}`);
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Failed");
              }
            }}
          >
            Record Decision
          </button>
          {msg && (
            <p className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
              {msg}
            </p>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

export default function ModerationPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR", "JURY_CHAIR"]} loginPath="/3e8e287e2388/login">
      <ModerationInner />
    </AuthGate>
  );
}
