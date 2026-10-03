"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalShell, StatusPill, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost } from "@/lib/api";

type AppRow = {
  applicationId: string;
  organisationName: string;
  categoryTitle: string;
  categoryCode?: string;
  sector: string;
  msme: string;
  status: string;
  evidenceStrength?: string;
  assignedJuryIds?: string[];
  adminDecision?: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
  submittedAt?: string;
};

const PENDING_VERIFY = new Set([
  "SUBMITTED",
  "ELIGIBILITY_REVIEW",
  "CLARIFICATION_REQUIRED",
  "VERIFICATION",
  "QUALIFIED",
  "READY_FOR_JURY",
]);

function ApplicationsInner() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(
    "We are not proceeding with this application.",
  );
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [decisionFilter, setDecisionFilter] = useState("ALL");

  const load = useCallback(() => {
    apiGet<{ applications: AppRow[] }>("/api/applications")
      .then((d) => setApps(d.applications))
      .catch(() => setApps([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return apps.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (decisionFilter !== "ALL" && (a.adminDecision || "PENDING") !== decisionFilter) return false;
      if (!needle) return true;
      return (
        a.applicationId.toLowerCase().includes(needle) ||
        a.organisationName.toLowerCase().includes(needle) ||
        a.categoryTitle.toLowerCase().includes(needle) ||
        (a.categoryCode || "").toLowerCase().includes(needle)
      );
    });
  }, [apps, q, statusFilter, decisionFilter]);

  const statuses = useMemo(
    () => Array.from(new Set(apps.map((a) => a.status))).sort(),
    [apps],
  );

  async function acceptForJury(applicationId: string) {
    setBusyId(applicationId);
    setMsg("");
    try {
      const res = await apiPost<{ message?: string; assignedJuryCount?: number }>(
        `/api/applications/${applicationId}/accept-for-jury`,
        {},
      );
      setMsg(
        res.message ||
          `${applicationId} verified — assigned to ${res.assignedJuryCount ?? "category"} jury.`,
      );
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Accept failed");
    } finally {
      setBusyId("");
    }
  }

  async function notProceeding(applicationId: string) {
    setRejectId(applicationId);
    setRejectReason("We are not proceeding with this application.");
  }

  async function confirmNotProceeding() {
    if (!rejectId) return;
    setBusyId(rejectId);
    setMsg("");
    try {
      await apiPost(`/api/applications/${rejectId}/reject`, { reason: rejectReason });
      setMsg(`${rejectId} marked not proceeding — applicant will see this on their dashboard.`);
      setRejectId(null);
      setRejectReason("We are not proceeding with this application.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId("");
    }
  }

  function exportCsv() {
    const header = [
      "applicationId",
      "organisationName",
      "categoryTitle",
      "categoryCode",
      "sector",
      "msme",
      "status",
      "adminDecision",
      "rejectionReason",
      "submittedAt",
    ];
    const rows = filtered.map((a) =>
      [
        a.applicationId,
        a.organisationName,
        a.categoryTitle,
        a.categoryCode || "",
        a.sector,
        a.msme,
        a.status,
        a.adminDecision || "PENDING",
        a.rejectionReason || "",
        a.submittedAt || "",
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `msme-nominations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function canVerify(a: AppRow) {
    return (
      (a.adminDecision === "PENDING" || !a.adminDecision) && PENDING_VERIFY.has(a.status)
    );
  }

  return (
    <PortalShell
      brand="Admin"
      subtitle="Nomination Verification"
      nav={secretariatNav}
      userLabel="Awards Administrator"
    >
      <div className="border border-black/10 bg-white p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
          Admin · Verification
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black italic uppercase sm:text-3xl">
              Nomination Queue
            </h1>
            <p className="mt-2 text-sm text-[#666]">
              View full nominations, verify for jury, reject with a reason, or delete.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            Export CSV ({filtered.length})
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="ID, organisation, category…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Admin decision</label>
            <select
              className="input"
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {msg && (
          <p className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
            {msg}
          </p>
        )}

        {rejectId && (
          <div className="mt-4 border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-900">Not proceeding — {rejectId}</p>
            <p className="mt-1 text-sm text-red-800">
              The applicant will see this message on their nomination dashboard. The application
              stays listed there (it is not permanently erased).
            </p>
            <textarea
              className="input mt-3 min-h-[88px] bg-white"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary !bg-red-700"
                disabled={busyId === rejectId || rejectReason.trim().length < 8}
                onClick={confirmNotProceeding}
              >
                Confirm not proceeding
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("We are not proceeding with this application.");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {filtered.map((a) => (
            <div key={a.applicationId} className="border border-black/10 bg-[#f7f4f2] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/3e8e287e2388/applications/${a.applicationId}`}
                    className="font-semibold text-[var(--brand-gold-dark)]"
                  >
                    {a.applicationId}
                  </Link>
                  <p className="mt-1 text-sm font-medium">{a.organisationName}</p>
                  <p className="mt-1 text-xs text-[#888]">
                    {a.categoryTitle}
                    {a.categoryCode ? ` (${a.categoryCode})` : ""} · {a.sector} · {a.msme}
                  </p>
                  {a.adminDecision === "REJECTED" && a.rejectionReason && (
                    <p className="mt-2 text-sm text-red-800">Not verified: {a.rejectionReason}</p>
                  )}
                  {a.adminDecision === "ACCEPTED" && (
                    <p className="mt-2 text-sm text-emerald-800">
                      Verified — with jury for evaluation
                      {a.assignedJuryIds?.length
                        ? ` (${a.assignedJuryIds.length} juror${a.assignedJuryIds.length === 1 ? "" : "s"})`
                        : ""}
                    </p>
                  )}
                </div>
                <StatusPill status={a.status.replaceAll("_", " ")} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/3e8e287e2388/applications/${a.applicationId}`}
                  className="btn-primary"
                >
                  View application
                </Link>
                {canVerify(a) && (
                  <>
                    <button
                      type="button"
                      className="btn-gold"
                      disabled={busyId === a.applicationId}
                      onClick={() => acceptForJury(a.applicationId)}
                    >
                      {busyId === a.applicationId ? "…" : "Verify & send to Jury"}
                    </button>
                  </>
                )}
                {a.adminDecision !== "REJECTED" && (
                  <button
                    type="button"
                    className="btn-secondary !border-red-300 !text-red-800"
                    disabled={busyId === a.applicationId}
                    onClick={() => notProceeding(a.applicationId)}
                  >
                    Not proceeding
                  </button>
                )}
              </div>
            </div>
          ))}
          {!filtered.length && (
            <p className="text-sm text-[#666]">
              {apps.length ? "No nominations match these filters." : "No nominations yet."}
            </p>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

export default function SecretariatApplicationsPage() {
  return (
    <AuthGate
      roles={["ADMINISTRATOR", "VERIFICATION", "JURY_CHAIR", "OBSERVER"]}
      loginPath="/3e8e287e2388/login"
    >
      <ApplicationsInner />
    </AuthGate>
  );
}
