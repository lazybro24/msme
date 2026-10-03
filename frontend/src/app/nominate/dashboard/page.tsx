"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  applicantNav,
  PortalShell,
  ProgressBar,
  StatCard,
  StatusPill,
} from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { CategoryBackdrop } from "@/components/awards/CategoryIcon";
import { getCategoryBySlug } from "@/content/awards";
import {
  computeNominationProgress,
  remainingAfterCommonProgress,
  sharedAnswersReady,
} from "@/lib/nominationCompleteness";
import { apiGet, apiDelete, getStoredUser } from "@/lib/api";
import { SkeletonStatRow, SkeletonCard } from "@/components/ui/Skeleton";

type App = {
  applicationId: string;
  categoryCode?: string;
  categorySlug?: string;
  categoryTitle: string;
  status: string;
  progress: number;
  submittedAt?: string;
  adminDecision?: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
  verifiedAt?: string;
  draftJson?: {
    step?: number;
    answers?: Record<string, string>;
  };
};

function decisionLabel(app: App) {
  if (app.adminDecision === "REJECTED") {
    return {
      tone: "reject" as const,
      title: "We are not proceeding with this application",
      body:
        app.rejectionReason ||
        "The Awards Secretariat is not proceeding with this nomination.",
    };
  }
  if (app.status === "DRAFT") return null;
  if (app.adminDecision === "ACCEPTED") {
    return {
      tone: "ok" as const,
      title: "Verified — under jury evaluation",
      body: "Admin verified your nomination. Independent jury evaluation is in progress.",
    };
  }
  if (app.status === "CLARIFICATION_REQUIRED") {
    return {
      tone: "wait" as const,
      title: "Action needed — clarification",
      body: "The secretariat asked for more information. Open Messages to reply and upload what’s requested.",
    };
  }
  if (
    ["ELIGIBILITY_REVIEW", "SUBMITTED", "VERIFICATION", "READY_FOR_JURY"].includes(app.status)
  ) {
    return {
      tone: "wait" as const,
      title: "Awaiting Admin verification",
      body: "Your nomination is with Admin. It will appear to the jury only after verification.",
    };
  }
  if (app.status === "NOT_QUALIFIED") {
    return {
      tone: "reject" as const,
      title: "We are not proceeding with this application",
      body:
        app.rejectionReason ||
        "The Awards Secretariat is not proceeding with this nomination.",
    };
  }
  return null;
}

type WorkflowStep = {
  id: number;
  label: string;
  title: string;
  body: string;
  href: string;
  done: boolean;
  locked: boolean;
  current: boolean;
};

function DashboardInner() {
  const user = getStoredUser();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [apps, setApps] = useState<App[]>([]);
  const [notes, setNotes] = useState<{ id: string; title: string; body: string; read: boolean }[]>(
    [],
  );
  const [profileComplete, setProfileComplete] = useState(false);
  const [docsComplete, setDocsComplete] = useState(0);
  const [docsTotal, setDocsTotal] = useState(7);
  const [clarificationCount, setClarificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadApps() {
    return apiGet<{ applications: App[] }>("/api/applications")
      .then((d) => setApps(d.applications))
      .catch(() => setApps([]));
  }

  useEffect(() => {
    // Core dashboard data first — show UI without waiting on clarifications badge
    Promise.all([
      loadApps(),
      apiGet<{ notifications: { id: string; title: string; body: string; read: boolean }[] }>(
        "/api/notifications",
      )
        .then((d) => setNotes(d.notifications))
        .catch(() => setNotes([])),
      apiGet<{ complete: boolean }>("/api/profile")
        .then((d) => setProfileComplete(d.complete))
        .catch(() => setProfileComplete(false)),
      apiGet<{ completeCount: number; totalMandatory: number }>("/api/documents")
        .then((d) => {
          setDocsComplete(d.completeCount);
          setDocsTotal(d.totalMandatory);
        })
        .catch(() => {
          setDocsComplete(0);
          setDocsTotal(7);
        }),
    ]).finally(() => setLoading(false));

    apiGet<{ clarifications: { id: string }[] }>("/api/clarifications")
      .then((d) => setClarificationCount(d.clarifications.length))
      .catch(() => setClarificationCount(0));
  }, []);

  function canDeleteApp(app: App) {
    if (app.adminDecision === "ACCEPTED") return false;
    return ![
      "READY_FOR_JURY",
      "JURY_EVALUATION",
      "MODERATION_REQUIRED",
      "FINALIST",
      "FINAL_ASSESSMENT",
      "RANKING_READY",
      "RESULT_LOCKED",
    ].includes(app.status);
  }

  function categoryMeta(app: App) {
    const bySlug = app.categorySlug ? getCategoryBySlug(app.categorySlug) : undefined;
    return {
      code: app.categoryCode || bySlug?.code || "",
      title: app.categoryTitle || bySlug?.title || "Category",
      criteriaCount: bySlug?.criteria?.length ?? 6,
    };
  }

  function appProgress(app: App) {
    if (app.status !== "DRAFT") return 100;
    const answers = app.draftJson?.answers || {};
    const step = typeof app.draftJson?.step === "number" ? app.draftJson.step : 1;
    const { criteriaCount } = categoryMeta(app);
    const computed = computeNominationProgress(answers, step, criteriaCount);
    return Math.max(app.progress || 0, computed);
  }

  function progressLabel(app: App) {
    if (app.status !== "DRAFT") return app.submittedAt ?? app.status.replaceAll("_", " ");
    const answers = app.draftJson?.answers || {};
    const step = typeof app.draftJson?.step === "number" ? app.draftJson.step : 1;
    const { criteriaCount } = categoryMeta(app);
    if (sharedAnswersReady(answers)) {
      const remaining = remainingAfterCommonProgress(answers, step, criteriaCount);
      if (remaining >= 100) return "Ready to submit";
      return `${remaining}% of scorecard path · Draft`;
    }
    return `${appProgress(app)}% · Draft`;
  }

  function progressBarValue(app: App) {
    if (app.status !== "DRAFT") return 100;
    const answers = app.draftJson?.answers || {};
    const step = typeof app.draftJson?.step === "number" ? app.draftJson.step : 1;
    const { criteriaCount } = categoryMeta(app);
    if (sharedAnswersReady(answers)) {
      // After common questions: loader shows remaining scorecard/wrap-up work only
      return remainingAfterCommonProgress(answers, step, criteriaCount);
    }
    return appProgress(app);
  }

  async function deleteApplication(app: App) {
    const ok = await confirm({
      title: "Leave this category?",
      message: `This removes “${app.categoryTitle}” from your nomination. Shared answers in other categories stay. This cannot be undone.`,
      confirmLabel: "Yes, leave category",
      cancelLabel: "Keep category",
    });
    if (!ok) return;
    setDeletingId(app.applicationId);
    try {
      await apiDelete(`/api/applications/${app.applicationId}`);
      await loadApps();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not leave this category");
    } finally {
      setDeletingId(null);
    }
  }

  const docsReady = docsComplete >= docsTotal && docsTotal > 0;
  const hasCategory = apps.length > 0;
  const draftApps = apps.filter((a) => a.status === "DRAFT");
  const draftApp = draftApps[0];
  const anySubmitted = apps.some((a) => a.status !== "DRAFT");
  const scorecardMode =
    apps.length > 1 &&
    (anySubmitted ||
      apps.some((a) => {
        const answers = a.draftJson?.answers || {};
        return sharedAnswersReady(answers) || appProgress(a) >= 40;
      }));
  const submitted = anySubmitted && draftApps.length === 0;
  const reviewHref = draftApp
    ? `/nominate/applications/${draftApp.applicationId}${scorecardMode ? "?focus=scorecard" : ""}`
    : apps[0]
      ? `/nominate/applications/${apps[0].applicationId}`
      : "/nominate/categories";
  const categoryNames = apps.map((a) => a.categoryTitle).filter(Boolean);

  function categoryFormHref(app: App) {
    if (!docsReady && app.status === "DRAFT") return "/nominate/documents";
    if (app.status === "DRAFT" && scorecardMode) {
      return `/nominate/applications/${app.applicationId}?focus=scorecard`;
    }
    if (app.status === "DRAFT") return `/nominate/applications/${app.applicationId}`;
    if (app.status === "CLARIFICATION_REQUIRED") return "/nominate/messages";
    return `/nominate/applications/${app.applicationId}?view=status`;
  }

  function categoryFormLabel(app: App) {
    if (app.status === "DRAFT") {
      if (!docsReady) return "Finish documents first";
      if (scorecardMode) return "Complete scorecard";
      return apps.length > 1 ? "Continue nomination" : "Continue nomination form";
    }
    if (app.status === "CLARIFICATION_REQUIRED") return "Open Messages";
    return "View status";
  }

  const accountDone = true;
  const profileDone = profileComplete;
  const categoryDone = hasCategory;
  const documentsDone = docsReady;
  const submitDone = submitted;

  const steps: WorkflowStep[] = [
    {
      id: 1,
      label: "1. Account",
      title: "Create account",
      body: "You’re signed in. Account setup is complete.",
      href: "/nominate/dashboard",
      done: accountDone,
      locked: false,
      current: false,
    },
    {
      id: 2,
      label: "2. Details",
      title: "Fill business details",
      body: "Complete your organisation profile (Udyam, address, contacts).",
      href: "/nominate/profile",
      done: profileDone,
      locked: false,
      current: !profileDone,
    },
    {
      id: 3,
      label: "3. Category",
      title: "Select award category",
      body: "Choose up to 2 award categories to nominate for.",
      href: "/nominate/categories",
      done: categoryDone,
      locked: !profileDone,
      current: profileDone && !categoryDone,
    },
    {
      id: 4,
      label: "4. Documents",
      title: "Upload documents",
      body: `Mandatory proof files (${docsComplete}/${docsTotal}) for jury Supporting Evidence.`,
      href: "/nominate/documents",
      done: documentsDone,
      locked: !profileDone || !categoryDone,
      current: profileDone && categoryDone && !documentsDone,
    },
    {
      id: 5,
      label: "5. Nomination form",
      title: scorecardMode ? "Finish category scorecards" : "Complete nomination form",
      body:
        apps.length > 1
          ? scorecardMode
            ? `Shared details are done. Complete and submit the scorecard for each remaining category: ${draftApps.map((a) => a.categoryTitle).join(" · ") || categoryNames.join(" · ")}.`
            : `One nomination for ${categoryNames.join(" · ")}. Fill shared details once, then each category’s scorecard.`
          : "Answer each section in order, then review and submit for verification.",
      href: reviewHref,
      done: submitted,
      locked: !profileDone || !categoryDone || !documentsDone,
      current: profileDone && categoryDone && documentsDone && !submitted,
    },
  ];

  const currentStep = steps.find((s) => s.current) ?? steps.find((s) => !s.done) ?? steps[steps.length - 1];
  const nextHref = currentStep.href;
  const nextLabel = currentStep.current
    ? currentStep.id === 5
      ? scorecardMode && draftApps[0]
        ? `Complete scorecard · ${draftApps[0].categoryTitle}`
        : "Continue nomination form"
      : `Continue · ${currentStep.title}`
    : submitDone
      ? "Open Application"
      : `Go to · ${currentStep.title}`;

  return (
    <PortalShell
      brand="Applicant Portal"
      subtitle={`Welcome, ${user?.fullName ?? "Applicant"}`}
      nav={applicantNav}
      userLabel={user?.fullName || user?.orgName || "Applicant"}
    >
      {confirmDialog}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
            Nomination workflow
          </p>
          <h1 className="mt-1 font-display text-3xl font-black italic uppercase tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-[#666]">
            Account → Business details → Category → Documents → Nomination form → Submit
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={nextHref} className="btn-primary">
            {nextLabel}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 space-y-6">
          <SkeletonStatRow />
          <SkeletonCard lines={4} />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Categories"
              value={apps.length ? `${apps.length} / 2` : "0 / 2"}
              hint={
                categoryNames.length
                  ? categoryNames.join(" · ")
                  : "Choose up to 2"
              }
            />
            <StatCard label="Profile" value={profileComplete ? "Ready" : "Incomplete"} />
            <StatCard
              label="Documents"
              value={`${docsComplete}/${docsTotal}`}
              hint={docsReady ? "Mandatory complete" : "Uploads pending"}
            />
            <StatCard label="Notifications" value={notes.filter((n) => !n.read).length} />
            <StatCard
              label="Current Status"
              value={apps[0]?.status?.replaceAll("_", " ") ?? "—"}
            />
          </div>

          {/* Guided workflow — hide once every application is submitted */}
          {!submitted && (
            <section className="mt-8 border border-black/10 bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-black italic uppercase">Your path to submit</h2>
              <p className="mt-1 text-sm text-[#666]">
                Complete each step in order. Locked steps open after the previous one is done.
              </p>
              <div className="mt-5 space-y-2">
                {steps.map((s) => {
                  const cardClass = s.current
                    ? "min-h-[7.5rem] border-[#e8a914] bg-[#faf6eb] px-5 py-6 sm:min-h-[8.5rem] sm:py-7"
                    : s.done
                      ? "min-h-0 border-[var(--brand-gold)]/40 bg-white px-4 py-2.5"
                      : "min-h-0 border-black/10 bg-[#f7f4f2] px-4 py-2.5";
                  const inner = (
                    <div
                      className={`flex flex-wrap items-center justify-between gap-3 border transition-[min-height,padding] duration-300 ${cardClass}`}
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold-dark)]">
                          Step {s.id}
                          {s.current ? " · Current" : s.done ? " · Done" : s.locked ? " · Locked" : ""}
                        </p>
                        <p
                          className={`mt-1 font-display font-bold uppercase tracking-tight ${
                            s.current ? "text-lg sm:text-xl" : "text-sm"
                          }`}
                        >
                          {s.title}
                        </p>
                        {s.current ? (
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#555]">{s.body}</p>
                        ) : (
                          <p className="mt-0.5 line-clamp-1 text-xs text-[#777]">{s.body}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {s.locked ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#888]">
                            Complete prior step
                          </span>
                        ) : s.done && !s.current ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-gold-dark)]">
                            Completed
                          </span>
                        ) : (
                          <span
                            className={`btn-secondary pointer-events-none !text-[10px] ${
                              s.current ? "!min-h-11 !px-4" : "!min-h-8 !px-3"
                            }`}
                          >
                            {s.id === 5 ? "Open review" : "Continue"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  return s.locked ? (
                    <div key={s.id} className="opacity-70">
                      {inner}
                    </div>
                  ) : (
                    <Link key={s.id} href={s.href} className="block transition hover:opacity-95">
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
            <section className="border border-black/10 bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-black italic uppercase">Your nomination</h2>
              {apps.length > 0 ? (
                <>
                  <p className="mt-2 text-sm text-[#666]">
                    {apps.length > 1 ? (
                      <>
                        One nomination · {apps.length} categories:{" "}
                        <span className="font-semibold text-[#1a1814]">
                          {categoryNames.join(" · ")}
                        </span>
                        . Shared business details are filled once. Each category only needs its own
                        scorecard answers, then submit.
                      </>
                    ) : (
                      <>
                        Category:{" "}
                        <span className="font-semibold text-[#1a1814]">{categoryNames[0]}</span>
                      </>
                    )}
                  </p>
                  {scorecardMode && draftApps.length > 0 && (
                    <p className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Shared sections are ready. Next: complete the scorecard and submit for{" "}
                      {draftApps.map((a) => a.categoryTitle).join(" and ")}.
                    </p>
                  )}
                  <div className="mt-5 space-y-3">
                    {apps.map((app) => {
                      const decision = decisionLabel(app);
                      const barValue = progressBarValue(app);
                      return (
                        <div
                          key={app.applicationId}
                          className="border border-black/10 bg-[#faf8f6] px-4 py-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold-dark)]">
                                Category
                              </p>
                              <h3 className="mt-1 font-display text-base font-bold uppercase tracking-tight">
                                {app.categoryTitle}
                              </h3>
                              <p className="text-xs text-[#888]">{app.applicationId}</p>
                            </div>
                            <StatusPill status={app.status.replaceAll("_", " ")} />
                          </div>
                          <div className="mt-3">
                            <ProgressBar value={barValue} />
                            <p className="mt-1 text-xs text-[#666]">{progressLabel(app)}</p>
                          </div>

                          {decision?.tone === "wait" && (
                            <div className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                              <p className="text-[10px] font-bold uppercase tracking-wide">
                                {decision.title}
                              </p>
                              <p className="mt-1 text-xs">{decision.body}</p>
                              {app.status === "CLARIFICATION_REQUIRED" && (
                                <Link
                                  href="/nominate/messages"
                                  className="mt-1 inline-block text-xs font-semibold underline"
                                >
                                  Go to Messages
                                </Link>
                              )}
                            </div>
                          )}
                          {decision?.tone === "ok" && (
                            <div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                              <p className="text-[10px] font-bold uppercase tracking-wide">
                                {decision.title}
                              </p>
                              <p className="mt-1 text-xs">{decision.body}</p>
                            </div>
                          )}
                          {decision?.tone === "reject" && (
                            <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
                              <p className="text-[10px] font-bold uppercase tracking-wide">
                                {decision.title}
                              </p>
                              <p className="mt-1 text-xs">{decision.body}</p>
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={categoryFormHref(app)}
                                className={
                                  docsReady || app.status !== "DRAFT"
                                    ? "btn-primary !min-h-9 !text-[10px]"
                                    : "btn-ghost !min-h-9 !text-[10px]"
                                }
                              >
                                {categoryFormLabel(app)}
                              </Link>
                            </div>
                            {canDeleteApp(app) && (
                              <button
                                type="button"
                                className="btn-ghost !min-h-9 !border-red-200 !px-2 !text-[10px] !text-red-800 hover:!border-red-400"
                                disabled={deletingId === app.applicationId}
                                onClick={() => void deleteApplication(app)}
                              >
                                {deletingId === app.applicationId ? "Removing…" : "Leave category"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-[#666]">
                  {!profileComplete
                    ? "Complete your business details first, then select award categories."
                    : "No categories yet — select up to 2 award categories to participate."}
                </p>
              )}
            </section>

            <aside className="border border-black/10 bg-white p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                Categories
              </p>
              <h2 className="mt-1 font-display text-xl font-black italic uppercase">
                {apps.length ? "Add a category" : "Choose categories"}
              </h2>
              <p className="mt-2 text-sm text-[#666]">
                Up to 2 categories ({apps.length}/2). Same business details for all — only the
                scorecard differs per category.
              </p>
              {apps.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {apps.map((app) => {
                    const meta = categoryMeta(app);
                    return (
                      <div
                        key={app.applicationId}
                        className="relative min-h-[6.5rem] overflow-hidden border border-black/15"
                      >
                        {meta.code ? (
                          <CategoryBackdrop
                            code={meta.code}
                            className="absolute inset-0 h-full w-full"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#2a1218]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />
                        <div className="relative z-[1] flex h-full min-h-[6.5rem] flex-col justify-end p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)]">
                            {meta.code || "Selected"}
                          </p>
                          <p className="mt-1 font-display text-sm font-bold uppercase leading-snug text-white">
                            {app.categoryTitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {apps.length >= 2 ? (
                <p className="mt-4 border border-black/10 bg-[#f7f4f2] px-4 py-3 text-sm text-[#555]">
                  Category limit reached (2/2). Leave a category above if you need to change.
                </p>
              ) : !profileComplete ? (
                <div className="mt-5 space-y-3">
                  <p className="text-sm text-[#555]">
                    Complete your business profile before selecting categories.
                  </p>
                  <Link href="/nominate/profile" className="btn-primary inline-flex">
                    Complete profile
                  </Link>
                </div>
              ) : (
                <Link href="/nominate/categories" className="btn-primary mt-5 inline-flex">
                  {apps.length ? "Add another category" : "Select categories"}
                </Link>
              )}
            </aside>
          </div>

          {notes[0] && (
            <section className="mt-6 border border-amber-200 bg-amber-50 p-5">
              <p className="badge-warn">Notification</p>
              <p className="mt-2 font-semibold">{notes[0].title}</p>
              <p className="mt-1 text-sm text-[#555]">{notes[0].body}</p>
              <Link href="/nominate/messages" className="btn-secondary mt-4">
                Open Messages
              </Link>
            </section>
          )}
        </>
      )}

      <div className="pointer-events-none fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
        <Link
          href="/nominate/messages"
          className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1a0c10] bg-gradient-to-br from-[#f5d56a] via-[#e8a914] to-[#c4890c] text-[#1a0c10] shadow-[0_12px_28px_-10px_rgba(196,137,12,0.7)] transition hover:scale-105 active:scale-95"
          aria-label="Open messages"
        >
          <MessageCircle size={22} />
          {clarificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1a0a0e] px-1 text-[10px] font-bold text-[var(--brand-gold)]">
              {clarificationCount}
            </span>
          )}
        </Link>
      </div>
    </PortalShell>
  );
}

export default function ApplicantDashboardPage() {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <DashboardInner />
    </AuthGate>
  );
}
