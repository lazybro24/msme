"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost, getStoredUser } from "@/lib/api";

type QueueItem = {
  applicationId: string;
  organisationName?: string | null;
  categoryTitle: string;
  status: string;
  lockedScores: number;
  variance: number;
  average: number | null;
  scores: { judge: string; score: number | null }[];
};

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
  const me = getStoredUser();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [appId, setAppId] = useState("");
  const [agg, setAgg] = useState<Agg | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  function loadQueue() {
    apiGet<{ queue: QueueItem[] }>("/api/admin/moderation-queue")
      .then((d) => {
        setQueue(d.queue);
        if (!appId && d.queue[0]) setAppId(d.queue[0].applicationId);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "Failed to load queue"));
  }

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!appId) {
      setAgg(null);
      return;
    }
    apiGet<{ aggregation: Agg | null }>(`/api/evaluations/${appId}/aggregation`)
      .then((d) => setAgg(d.aggregation))
      .catch(() => setAgg(null));
  }, [appId]);

  const selected = queue.find((q) => q.applicationId === appId);

  return (
    <PortalShell
      brand="Secretariat"
      subtitle="Jury Chair · Moderation Panel"
      nav={secretariatNav}
      userLabel={me?.fullName ?? "Jury Chair"}
    >
      <div className="border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <p className="badge-warn">⚠ Moderation Queue</p>
        <h1 className="mt-3 font-display text-3xl font-black italic uppercase">
          {appId || "No items"}
        </h1>
        <p className="mt-1 text-sm text-[#555]">
          Auto-listed when independent score spread exceeds 20 points, or status is
          MODERATION_REQUIRED.
        </p>
        <div className="mt-3">
          <label className="label">Application in queue</label>
          <select
            className="input max-w-lg"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          >
            {!queue.length && <option value="">No moderation items</option>}
            {queue.map((q) => (
              <option key={q.applicationId} value={q.applicationId}>
                {q.applicationId} · spread {q.variance} · {q.organisationName || q.categoryTitle}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <p className="mt-2 text-sm text-[#555]">
            {selected.organisationName} · {selected.categoryTitle} · {selected.status} ·{" "}
            {selected.lockedScores} locked scores
          </p>
        )}
      </div>

      {msg && (
        <p className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
          {msg}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-black/10 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-black italic uppercase">Independent Scores</h2>
          <ul className="mt-4 space-y-3">
            {(agg?.scores ?? selected?.scores ?? []).map((s) => (
              <li key={s.judge} className="border border-black/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{s.judge}</span>
                  <span className="font-display text-2xl font-black italic">{s.score ?? "—"}</span>
                </div>
              </li>
            ))}
            {!agg && !selected?.scores?.length && (
              <li className="text-sm text-[#666]">No locked evaluations yet.</li>
            )}
          </ul>
          {(agg || selected) && (
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-[#f7f4f2] px-2 py-3">
                <dt className="text-[10px] font-bold uppercase text-[#888]">High</dt>
                <dd className="font-bold">{agg?.highest ?? "—"}</dd>
              </div>
              <div className="bg-[#f7f4f2] px-2 py-3">
                <dt className="text-[10px] font-bold uppercase text-[#888]">Low</dt>
                <dd className="font-bold">{agg?.lowest ?? "—"}</dd>
              </div>
              <div className="bg-[#f7f4f2] px-2 py-3">
                <dt className="text-[10px] font-bold uppercase text-[#888]">Spread</dt>
                <dd className="font-bold text-amber-800">
                  {agg?.variance ?? selected?.variance ?? "—"}
                </dd>
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
          <textarea
            className="input mt-4 min-h-28"
            placeholder="Moderation notes (audited)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!appId || !outcome}
              onClick={async () => {
                try {
                  await apiPost(`/api/admin/moderation/${appId}`, {
                    decision: outcome,
                    notes,
                  });
                  setMsg(`Decision recorded for ${appId}`);
                  setNotes("");
                  loadQueue();
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              Record decision
            </button>
            {appId && (
              <Link href={`/3e8e287e2388/applications/${appId}`} className="btn-secondary">
                Open application
              </Link>
            )}
          </div>
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
