"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    apiGet<{ applications: AppRow[] }>("/api/applications")
      .then((d) => setApps(d.applications))
      .catch(() => setApps([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  async function rejectApplication() {
    if (!rejectId) return;
    setBusyId(rejectId);
    setMsg("");
    try {
      await apiPost(`/api/applications/${rejectId}/reject`, { reason: rejectReason });
      setMsg(`${rejectId} not verified — applicant will see your reason.`);
      setRejectId(null);
      setRejectReason("");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusyId("");
    }
  }

  function canVerify(a: AppRow) {
    return (
      (a.adminDecision === "PENDING" || !a.adminDecision) &&
      PENDING_VERIFY.has(a.status)
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
        <h1 className="mt-2 font-display text-2xl font-black italic uppercase sm:text-3xl">
          Nomination Queue
        </h1>
        <p className="mt-2 text-sm text-[#666]">
          New nominations wait here. Verify (Accept) to send to category jury, or Not Verify with a
          reason the applicant will see on their dashboard.
        </p>

        {msg && (
          <p className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
            {msg}
          </p>
        )}

        {rejectId && (
          <div className="mt-4 border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-900">Not verify {rejectId}</p>
            <p className="mt-1 text-sm text-red-800">
              Explain why this nomination is not verified. The applicant will see this message.
            </p>
            <textarea
              className="input mt-3 min-h-[88px] bg-white"
              placeholder="e.g. Mysuru operations could not be verified from uploaded documents…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary !bg-red-700"
                disabled={busyId === rejectId || rejectReason.trim().length < 8}
                onClick={rejectApplication}
              >
                Confirm not verified
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {apps.map((a) => (
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
                    <p className="mt-2 text-sm text-red-800">
                      Not verified: {a.rejectionReason}
                    </p>
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
              {canVerify(a) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-gold"
                    disabled={busyId === a.applicationId}
                    onClick={() => acceptForJury(a.applicationId)}
                  >
                    {busyId === a.applicationId ? "…" : "Verify & send to Jury"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busyId === a.applicationId}
                    onClick={() => {
                      setRejectId(a.applicationId);
                      setRejectReason("");
                    }}
                  >
                    Not verify
                  </button>
                </div>
              )}
            </div>
          ))}
          {!apps.length && <p className="text-sm text-[#666]">No nominations yet.</p>}
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
