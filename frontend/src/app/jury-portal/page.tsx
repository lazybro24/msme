"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalShell, StatCard, StatusPill, juryNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost, getStoredUser } from "@/lib/api";

type Assignment = {
  id: string;
  category: string;
  categoryCode?: string;
  organisationName?: string;
  sector: string;
  status: string;
  deadline: string;
  conflictCleared: boolean;
  scoreLocked: boolean;
  myScore?: number | null;
  recommendation?: string | null;
  scoredAt?: string | null;
  hasDraft?: boolean;
};

type ReopenRequest = {
  applicationId: string;
  organisationName: string | null;
  juryUserId: string;
  juryName: string | null;
  reason: string | null;
  requestedAt: string | null;
};

function JuryInner() {
  const user = getStoredUser();
  const isChair = Boolean(user?.roles?.includes("JURY_CHAIR") || user?.roles?.includes("ADMINISTRATOR"));
  const [rows, setRows] = useState<Assignment[]>([]);
  const [reopenRequests, setReopenRequests] = useState<ReopenRequest[]>([]);
  const [conductAccepted, setConductAccepted] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "resume" | "completed">("all");

  function applyFilter(next: "all" | "pending" | "resume" | "completed") {
    setFilter(next);
    requestAnimationFrame(() => {
      document.getElementById("evaluations-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function load() {
    apiGet<{
      assignments: Assignment[];
      conductAccepted?: boolean;
      reopenRequests?: ReopenRequest[];
    }>("/api/evaluations/mine")
      .then((d) => {
        setRows(d.assignments);
        setConductAccepted(d.conductAccepted !== false);
        setReopenRequests(d.reopenRequests ?? []);
      })
      .catch(() => setRows([]));
  }

  useEffect(() => {
    load();
  }, []);

  const completed = rows.filter((a) => a.status === "Completed");
  const resume = rows.filter(
    (a) => a.status === "In Progress" || (a.hasDraft && !a.scoreLocked),
  );
  const pending = rows.filter(
    (a) => a.status === "Pending" || a.status === "Reopen Pending",
  );
  const avgScore =
    completed.length > 0
      ? (
          completed.reduce((s, r) => s + (r.myScore ?? 0), 0) / completed.length
        ).toFixed(1)
      : "—";

  const filteredRows =
    filter === "pending"
      ? pending
      : filter === "resume"
        ? resume
        : filter === "completed"
          ? completed
          : rows;

  const listTitle =
    filter === "pending"
      ? "Pending evaluations"
      : filter === "resume"
        ? "Resume evaluations"
        : filter === "completed"
          ? "Completed evaluations"
          : "Assigned applications";

  async function approveReopen(r: ReopenRequest) {
    try {
      await apiPost(`/api/evaluations/${r.applicationId}/reopen/approve`, {
        juryUserId: r.juryUserId,
      });
      setMsg(`Reopen approved for ${r.applicationId}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Approve failed");
    }
  }

  return (
    <PortalShell
      brand="Jury Portal"
      subtitle="Independent Evaluation"
      nav={juryNav}
      userLabel={user?.fullName ?? "Jury"}
    >
      {!conductAccepted && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p>Accept the Code of Conduct before scoring nominees.</p>
          <Link href="/jury-portal/conduct" className="btn-primary">
            Accept now
          </Link>
        </div>
      )}

      {msg && (
        <p className="mb-4 border border-[#e8a914]/30 bg-[#faf6eb] px-4 py-3 text-sm text-[#1a1814]">
          {msg}
        </p>
      )}

      <div className="text-center">
        <h1 className="font-display text-3xl font-black italic uppercase">My Evaluations</h1>
        <p className="mt-2 text-sm text-[#666]">
          Click a status above to filter your assigned nominees.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Nominees"
          value={rows.length}
          active={filter === "all"}
          onClick={() => applyFilter("all")}
        />
        <StatCard
          label="Pending"
          value={pending.length}
          hint="Not started yet"
          active={filter === "pending"}
          onClick={() => applyFilter("pending")}
        />
        <StatCard
          label="Resume evaluation"
          value={resume.length}
          hint="Saved drafts"
          active={filter === "resume"}
          onClick={() => applyFilter("resume")}
        />
        <StatCard
          label="Completed"
          value={completed.length}
          active={filter === "completed"}
          onClick={() => applyFilter("completed")}
        />
        <StatCard label="Avg score" value={avgScore} hint="Your locked scores" />
      </div>

      {isChair && reopenRequests.length > 0 && (
        <section className="mt-8 border border-amber-200 bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-black uppercase italic">
            Reopen requests
          </h2>
          <div className="mt-4 space-y-3">
            {reopenRequests.map((r) => (
              <div
                key={`${r.applicationId}-${r.juryUserId}`}
                className="flex flex-wrap items-center justify-between gap-3 border border-black/10 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">
                    {r.applicationId} · {r.juryName || "Jury"}
                  </p>
                  <p className="text-sm text-[#666]">{r.reason}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => approveReopen(r)}>
                  Approve reopen
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        id="evaluations-list"
        className="mt-8 border border-[#e8a914]/25 bg-white p-5 shadow-[0_14px_32px_-24px_rgba(26,24,20,0.3)] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
              Nominees
            </p>
            <h2 className="font-display text-lg font-black uppercase italic">{listTitle}</h2>
          </div>
          {filter !== "all" && (
            <button type="button" className="btn-ghost" onClick={() => applyFilter("all")}>
              Show all
            </button>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {filteredRows.map((a) => {
            const canResume =
              a.status === "In Progress" || Boolean(a.hasDraft && !a.scoreLocked);
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-black/10 px-4 py-4"
              >
                <div>
                  <p className="font-display text-base font-bold uppercase">{a.id}</p>
                  <p className="text-sm text-[#666]">
                    {a.organisationName ? `${a.organisationName} · ` : ""}
                    {a.category}
                    {a.categoryCode ? ` (${a.categoryCode})` : ""} · {a.sector}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--brand-gold-dark)]">
                    Deadline · {a.deadline}
                  </p>
                  {a.scoreLocked && a.myScore != null && (
                    <p className="mt-2 text-sm font-semibold text-[var(--brand-gold-dark)]">
                      Your score: {a.myScore}
                      {a.recommendation ? ` · ${a.recommendation}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={a.status} />
                  {canResume && (
                    <Link href={`/jury-portal/evaluate/${a.id}`} className="btn-primary">
                      Resume evaluation
                    </Link>
                  )}
                  {a.status === "Pending" && (
                    <Link href={`/jury-portal/evaluate/${a.id}`} className="btn-primary">
                      Evaluate
                    </Link>
                  )}
                  {a.scoreLocked && (
                    <Link href={`/jury-portal/evaluate/${a.id}`} className="btn-secondary">
                      View scorecard
                    </Link>
                  )}
                  {a.status === "Reopen Pending" && (
                    <Link href={`/jury-portal/evaluate/${a.id}`} className="btn-secondary">
                      View
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {!filteredRows.length && (
            <p className="text-sm text-[#666]">
              {filter === "all"
                ? "No nominees yet. Admin must verify a nomination in your category before it appears here."
                : `No ${filter === "resume" ? "saved" : filter} evaluations to show.`}
            </p>
          )}
        </div>
      </section>

      {completed.length > 0 && filter !== "pending" && filter !== "resume" && (
        <section className="mt-6 border border-black/10 bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-black uppercase italic">My submitted scores</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-[10px] uppercase tracking-[0.12em] text-[#888]">
                  <th className="py-2 pr-3 text-left">Application</th>
                  <th className="py-2 pr-3 text-left">Category</th>
                  <th className="py-2 pr-3 text-left">Score</th>
                  <th className="py-2 text-left">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((a) => (
                  <tr key={a.id} className="border-b border-black/5">
                    <td className="py-3 pr-3 font-medium">{a.id}</td>
                    <td className="py-3 pr-3">{a.category}</td>
                    <td className="py-3 pr-3 font-bold text-[var(--brand-gold-dark)]">
                      {a.myScore ?? "—"}
                    </td>
                    <td className="py-3">{a.recommendation ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PortalShell>
  );
}

export default function JuryDashboardPage() {
  return (
    <AuthGate roles={["JURY", "JURY_CHAIR", "ADMINISTRATOR"]} loginPath="/jury-portal/login">
      <JuryInner />
    </AuthGate>
  );
}
