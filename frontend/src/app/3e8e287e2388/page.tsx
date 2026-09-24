"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PortalShell,
  StatCard,
  StatusPill,
  secretariatNav,
} from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, clearSession, getStoredUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { SkeletonStatRow, SkeletonCard } from "@/components/ui/Skeleton";

function AdminInner() {
  const router = useRouter();
  const user = getStoredUser();
  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [apps, setApps] = useState<
    { applicationId: string; organisationName: string; categoryTitle: string; status: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{
        total: number;
        submitted: number;
        eligibilityPending: number;
        clarificationsPending: number;
        verified: number;
        qualified: number;
        readyForJury: number;
        underEvaluation: number;
        moderationRequired: number;
        finalists: number;
        notQualified: number;
        analytics: Record<string, string>;
      }>("/api/admin/stats")
        .then((d) => setStats(d as unknown as Record<string, number | string>))
        .catch(() => undefined),
      apiGet<{ applications: typeof apps }>("/api/applications")
        .then((d) => setApps(d.applications))
        .catch(() => setApps([])),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <PortalShell
      brand="Admin"
      subtitle="Awards operations · authorised team only"
      nav={secretariatNav}
      userLabel={user?.fullName ?? "Administrator"}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
            Internal
          </p>
          <h1 className="mt-1 font-display text-3xl font-black italic uppercase tracking-tight">
            Admin Console
          </h1>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            clearSession();
            router.push("/3e8e287e2388/login");
          }}
        >
          Logout
        </button>
      </div>

      {loading ? (
        <div className="mt-8 space-y-6">
          <SkeletonStatRow count={8} />
          <SkeletonCard lines={5} />
        </div>
      ) : (
        <>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={Number(stats.total ?? 0)} />
        <StatCard label="Submitted" value={Number(stats.submitted ?? 0)} />
        <StatCard label="Eligibility Pending" value={Number(stats.eligibilityPending ?? 0)} />
        <StatCard label="Clarifications" value={Number(stats.clarificationsPending ?? 0)} />
        <StatCard label="Ready for Jury" value={Number(stats.readyForJury ?? 0)} />
        <StatCard label="Under Evaluation" value={Number(stats.underEvaluation ?? 0)} />
        <StatCard label="Moderation" value={Number(stats.moderationRequired ?? 0)} />
        <StatCard label="Finalists" value={Number(stats.finalists ?? 0)} />
      </div>

      {Number(stats.moderationRequired) > 0 && (
        <div className="mt-6 border border-amber-200 bg-amber-50 p-5">
          <p className="badge-warn">⚠ Moderation Required</p>
          <p className="mt-2 font-semibold">
            Score variance detected on one or more applications (spread &gt; 20).
          </p>
          <Link href="/3e8e287e2388/moderation" className="btn-secondary mt-4">
            Open Moderation
          </Link>
        </div>
      )}

      <section className="mt-8 border border-black/10 bg-white p-5">
        <h2 className="font-display text-xl font-black italic uppercase">Applications</h2>
        <div className="mt-4 space-y-2">
          {apps.map((a) => (
            <Link
              key={a.applicationId}
              href={`/3e8e287e2388/applications/${a.applicationId}`}
              className="flex flex-wrap items-center justify-between gap-2 border border-black/10 px-3 py-3 text-sm transition-colors hover:bg-[rgba(232,169,20,0.06)]"
            >
              <span>
                <strong>{a.applicationId}</strong> · {a.organisationName} · {a.categoryTitle}
              </span>
              <StatusPill status={String(a.status).replaceAll("_", " ")} />
            </Link>
          ))}
        </div>
      </section>
        </>
      )}
    </PortalShell>
  );
}

export default function SecretariatDashboardPage() {
  return (
    <AuthGate
      roles={["ADMINISTRATOR", "VERIFICATION", "JURY_CHAIR"]}
      loginPath="/3e8e287e2388/login"
    >
      <AdminInner />
    </AuthGate>
  );
}
