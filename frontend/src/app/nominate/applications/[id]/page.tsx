"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Pencil } from "lucide-react";
import {
  applicantNav,
  PortalShell,
  ProgressBar,
  StatusPill,
} from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import {
  IncompleteGateDialog,
  markIncompleteFields,
} from "@/components/portal/IncompleteGate";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { applicationSteps } from "@/lib/mock/data";
import { getCategoryBySlug, awardCategories } from "@/content/awards";
import { CategoryBackdrop } from "@/components/awards/CategoryIcon";
import { apiGet, apiPatch, apiPost, API_URL, getToken } from "@/lib/api";
import { useUnsavedProcessGuard } from "@/hooks/UnsavedProcessContext";
import type { BusinessProfile } from "@/app/nominate/profile/page";
import {
  activeNominationSteps,
  computeNominationProgress,
  firstIncompleteActiveStep,
  missingNominationFields,
  nextActiveStep,
  prevActiveStep,
  remainingAfterCommonProgress,
  reuseMatchingCategoryAnswers,
  sharedAnswersReady,
  sharedNominationComplete,
  stepForMissingField,
  stepLabelForMissingField,
} from "@/lib/nominationCompleteness";
import { useRouter, useSearchParams } from "next/navigation";
import { ProcessOverlay } from "@/components/ui/ProcessOverlay";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type Answers = Record<string, string>;

type DocRow = {
  id?: string;
  name: string;
  fileName?: string | null;
  evidenceType: string;
  done?: boolean;
};

const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

function WorkspaceInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusScorecard = searchParams.get("focus") === "scorecard";
  const viewStatus = searchParams.get("view") === "status";
  const code = id.split("-")[1] ?? "MFG";
  const byCode = awardCategories.find((c) => c.code === code);
  const [appMeta, setAppMeta] = useState({
    id,
    categorySlug: byCode?.slug ?? "manufacturing-excellence",
    categoryTitle: byCode?.title ?? "Application",
    status: "DRAFT",
    statusRaw: "DRAFT",
    adminDecision: "PENDING" as "PENDING" | "ACCEPTED" | "REJECTED",
    rejectionReason: "" as string | undefined,
    submittedAt: "" as string | undefined,
    verifiedAt: "" as string | undefined,
  });
  const viewAnswers = searchParams.get("view") === "answers";
  const isDraft = appMeta.statusRaw === "DRAFT";
  const showStatusView = !isDraft && !viewAnswers && (viewStatus || !focusScorecard);
  const [loading, setLoading] = useState(true);
  const [docsGateChecked, setDocsGateChecked] = useState(false);
  const category = getCategoryBySlug(appMeta.categorySlug) ?? byCode;
  const scorecard = category?.criteria ?? [];
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState("");
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const [incompleteBanner, setIncompleteBanner] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [siblingApps, setSiblingApps] = useState<
    {
      applicationId: string;
      categoryTitle: string;
      categorySlug?: string;
      status: string;
      draftJson?: { answers?: Answers };
    }[]
  >([]);
  const stepRootRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef<Answers>({});
  const { confirm, dialog: confirmDialog } = useConfirm();
  const current = applicationSteps[step - 1];
  const multiCategory = siblingApps.length > 1;
  const scorecardOnly = useMemo(
    () => multiCategory && sharedNominationComplete(answers),
    [multiCategory, answers],
  );
  const activeSteps = useMemo(
    () => activeNominationSteps(answers, multiCategory),
    [answers, multiCategory],
  );
  const completion = useMemo(
    () => computeNominationProgress(answers, step, scorecard.length),
    [answers, step, scorecard.length],
  );
  const commonDone = useMemo(() => sharedAnswersReady(answers), [answers]);
  const remainingPath = useMemo(
    () => remainingAfterCommonProgress(answers, step, scorecard.length),
    [answers, step, scorecard.length],
  );
  const loaderValue = commonDone && (focusScorecard || multiCategory)
    ? remainingPath
    : completion;
  const maxReachableStep = useMemo(() => {
    const firstBad = firstIncompleteActiveStep(
      answers,
      scorecard.length,
      multiCategory,
    );
    return Math.min(applicationSteps.length, Math.max(1, firstBad));
  }, [answers, scorecard.length, multiCategory]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useUnsavedProcessGuard({
    dirty: dirty && isDraft,
    onSave: async () => {
      await saveDraft();
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await apiGet<{
          application: {
            applicationId: string;
            categorySlug: string;
            categoryTitle: string;
            status: string;
            adminDecision?: "PENDING" | "ACCEPTED" | "REJECTED";
            rejectionReason?: string;
            submittedAt?: string;
            verifiedAt?: string;
            draftJson?: { step?: number; answers?: Answers };
          };
        }>(`/api/applications/${id}`);
        if (cancelled) return;

        const statusRaw = d.application.status;
        setAppMeta({
          id: d.application.applicationId,
          categorySlug: d.application.categorySlug,
          categoryTitle: d.application.categoryTitle,
          status: statusRaw.replaceAll("_", " "),
          statusRaw,
          adminDecision: d.application.adminDecision ?? "PENDING",
          rejectionReason: d.application.rejectionReason,
          submittedAt: d.application.submittedAt,
          verifiedAt: d.application.verifiedAt,
        });

        if (statusRaw === "DRAFT") {
          const docs = await apiGet<{ completeCount: number; totalMandatory: number }>(
            "/api/documents",
          );
          if (cancelled) return;
          if (docs.totalMandatory > 0 && docs.completeCount < docs.totalMandatory) {
            router.replace("/nominate/documents");
            return;
          }
        }

        const draft = d.application.draftJson;
        let loadedAnswers: Answers =
          draft?.answers && typeof draft.answers === "object" ? { ...draft.answers } : {};
        const cat =
          getCategoryBySlug(d.application.categorySlug) ||
          awardCategories.find((c) => c.slug === d.application.categorySlug);
        const qCount = cat?.criteria?.length ?? scorecard.length;
        const draftStep =
          typeof draft?.step === "number" && draft.step >= 1 && draft.step <= applicationSteps.length
            ? draft.step
            : 1;

        let listApps: {
          applicationId: string;
          categoryTitle: string;
          categorySlug?: string;
          status: string;
          draftJson?: { answers?: Answers };
        }[] = [];
        try {
          const list = await apiGet<{
            applications: {
              applicationId: string;
              categoryTitle: string;
              categorySlug?: string;
              status: string;
              draftJson?: { answers?: Answers };
            }[];
          }>("/api/applications");
          listApps = list.applications || [];
          if (!cancelled) setSiblingApps(listApps);
        } catch {
          if (!cancelled) setSiblingApps([]);
        }

        // Reuse identical scorecard questions answered on another category
        const criteria = cat?.criteria ?? [];
        for (const sib of listApps) {
          if (sib.applicationId === d.application.applicationId) continue;
          const sibCat =
            getCategoryBySlug(sib.categorySlug || "") ||
            awardCategories.find((c) => c.slug === sib.categorySlug);
          const sibAnswers = sib.draftJson?.answers;
          if (!sibCat?.criteria?.length || !sibAnswers) continue;
          loadedAnswers = reuseMatchingCategoryAnswers(
            criteria,
            loadedAnswers,
            sibCat.criteria,
            sibAnswers,
          ) as Answers;
        }

        if (!cancelled) setAnswers(loadedAnswers);

        const multi = listApps.length > 1;
        const resume = firstIncompleteActiveStep(loadedAnswers, qCount, multi);
        const otherSubmitted = listApps.some(
          (a) => a.applicationId !== d.application.applicationId && a.status !== "DRAFT",
        );
        const sharedReady = sharedAnswersReady(loadedAnswers);
        // Multi-category: skip shared steps already answered on another category
        const preferScorecard =
          statusRaw === "DRAFT" &&
          (focusScorecard ||
            otherSubmitted ||
            (multi && sharedReady) ||
            (multi && sharedNominationComplete(loadedAnswers)));

        if (statusRaw !== "DRAFT") {
          setStep(applicationSteps.length);
        } else if (preferScorecard) {
          setStep(resume);
        } else {
          setStep(Math.min(draftStep, resume));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setDocsGateChecked(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, focusScorecard]);

  function collectStepAnswers(): Answers {
    const root = stepRootRef.current;
    if (!root) return {};
    const next: Answers = {};
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input[name], textarea[name], select[name]",
    ).forEach((el) => {
      if (el instanceof HTMLInputElement && el.type === "radio") {
        if (el.checked) next[el.name] = el.value || "yes";
        return;
      }
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        next[el.name] = el.checked ? "yes" : "";
        return;
      }
      next[el.name] = String(el.value || "");
    });
    return next;
  }

  function mergeAnswers(partial: Answers): Answers {
    const merged = { ...answersRef.current, ...partial };
    answersRef.current = merged;
    setAnswers(merged);
    return merged;
  }

  async function fetchDocumentSnapshot() {
    try {
      const d = await apiGet<{
        documents: {
          id: string;
          name: string;
          fileName?: string | null;
          evidenceType: string;
          fileUrl?: string | null;
        }[];
        mandatory: {
          name: string;
          done: boolean;
          documentId: string | null;
          fileName?: string | null;
        }[];
      }>("/api/documents");
      const docs = (d.documents || []).map((x) => ({
        id: x.id,
        name: x.name,
        fileName: x.fileName || null,
        evidenceType: x.evidenceType,
        fileUrl: x.fileUrl || null,
      }));
      if (docs.length) return docs;
      return (d.mandatory || [])
        .filter((m) => m.done)
        .map((m) => ({
          id: m.documentId || "",
          name: m.name,
          fileName: m.fileName || null,
          evidenceType: "Statutory",
          fileUrl: null as string | null,
        }));
    } catch {
      return [];
    }
  }

  async function buildSubmitPayload() {
    const partial = collectStepAnswers();
    const submittedAt = new Date();
    const merged = mergeAnswers({
      ...partial,
      decl_date: formatSystemDateTime(submittedAt),
      decl_datetime: submittedAt.toISOString(),
    });
    const documents = await fetchDocumentSnapshot();
    return {
      step: applicationSteps.length,
      answers: merged,
      documents,
      savedAt: submittedAt.toISOString(),
      submittedFromReview: true,
    };
  }

  async function saveDraft(nextAnswers?: Answers, nextStep?: number) {
    const partial = nextAnswers ? {} : collectStepAnswers();
    const merged = nextAnswers ?? mergeAnswers(partial);
    const s = nextStep ?? step;
    setSaving(true);
    setSaveError("");
    try {
      const documents = await fetchDocumentSnapshot();
      await apiPatch(`/api/applications/${id}`, {
        progress: computeNominationProgress(merged, s, scorecard.length),
        draftJson: {
          step: s,
          answers: merged,
          documents,
          savedAt: new Date().toISOString(),
        },
      });
      setSavedAt(new Date().toLocaleTimeString());
      setSubmitMsg(
        `Draft saved — ${Object.keys(merged).length} answers, ${documents.length} document${documents.length === 1 ? "" : "s"}.`,
      );
      setDirty(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save draft";
      setSaveError(msg);
      setSubmitMsg("");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  function assertStepComplete(): boolean {
    const missing = markIncompleteFields(stepRootRef.current);
    if (missing > 0) {
      setMissingCount(missing);
      setIncompleteBanner(
        `Please fill all mandatory fields marked with * before continuing. ${missing} required field${missing === 1 ? "" : "s"} still empty.`,
      );
      setIncompleteOpen(true);
      return false;
    }
    setIncompleteBanner("");
    setMissingCount(0);
    return true;
  }

  function goNext(merged: Answers) {
    const next = nextActiveStep(step, merged, multiCategory);
    setStep(next);
    void saveDraft(merged, next);
  }

  function saveContinue() {
    const partial = collectStepAnswers();
    const merged = mergeAnswers(partial);
    if (!assertStepComplete()) return;
    goNext(merged);
  }

  function tryGoToStep(target: number) {
    if (target === step) return;
    if (!activeSteps.includes(target)) {
      setIncompleteBanner(
        "That section was already answered for this nomination. Only the category scorecard differs.",
      );
      setIncompleteOpen(true);
      return;
    }
    const partial = collectStepAnswers();
    const merged = mergeAnswers(partial);

    // Always allow going back within the active path
    if (target < step) {
      setStep(target);
      void saveDraft(merged, target);
      return;
    }

    const path = activeNominationSteps(merged, multiCategory);
    const curIdx = path.indexOf(step);
    const tgtIdx = path.indexOf(target);
    // Forward: only one active step at a time, and current must be complete
    if (tgtIdx > curIdx + 1 || target > maxReachableStep) {
      setIncompleteBanner(
        "Please complete each section in order. Use Continue after filling required fields.",
      );
      setIncompleteOpen(true);
      return;
    }
    if (!assertStepComplete()) return;
    setStep(target);
    void saveDraft(merged, target);
  }

  async function confirmAndSaveDraft() {
    const ok = await confirm({
      title: "Are you sure?",
      message:
        "Save your filled answers and uploaded documents as a draft in the database? You can continue editing after saving.",
      confirmLabel: "Yes, save draft",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    await saveDraft().catch(() => undefined);
  }

  if (!loading && docsGateChecked && showStatusView && !isDraft) {
    return (
      <PortalShell
        brand="Nomination"
        subtitle={`${appMeta.categoryTitle} · Status`}
        nav={applicantNav}
        userLabel={appMeta.status}
      >
        <ApplicationStatusView
          appMeta={appMeta}
          siblingApps={siblingApps}
          onViewAnswers={() => {
            setStep(applicationSteps.length);
            router.replace(`/nominate/applications/${appMeta.id}?view=answers`);
          }}
        />
      </PortalShell>
    );
  }

  if (loading || !docsGateChecked) {
    return (
      <PortalShell
        brand="Nomination"
        subtitle={appMeta.categoryTitle}
        nav={applicantNav}
        userLabel={appMeta.status}
      >
        <p className="text-sm text-[#666]">Loading nomination…</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      brand="Nomination"
      subtitle={
        siblingApps.length > 1
          ? `One nomination · ${siblingApps.length} categories`
          : `${appMeta.categoryTitle} · ${appMeta.id}`
      }
      nav={applicantNav}
      userLabel={appMeta.status}
    >
      {confirmDialog}
      <IncompleteGateDialog
        open={incompleteOpen}
        missingCount={missingCount}
        title="Required fields incomplete"
        allowSkip={false}
        onStay={() => setIncompleteOpen(false)}
      />
      <ProcessOverlay open={saving} />

      <div className="mb-6 border border-black/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
              {!isDraft
                ? "Submitted nomination · read only"
                : siblingApps.length > 1
                  ? "Shared nomination"
                  : "Nomination form"}{" "}
              —{" "}
              {isDraft && commonDone && (focusScorecard || siblingApps.length > 1)
                ? `${remainingPath}% of scorecard path`
                : `${completion}%`}
            </p>
            <h1 className="mt-1 font-display text-2xl font-black italic uppercase sm:text-3xl">
              {!isDraft
                ? appMeta.categoryTitle
                : step === 5 || focusScorecard
                  ? `Scorecard · ${appMeta.categoryTitle}`
                  : siblingApps.length > 1
                    ? "Your nomination"
                    : appMeta.categoryTitle}
            </h1>
            <p className="text-sm text-[#888]">{appMeta.id}</p>
            {multiCategory && isDraft && (
              <p className="mt-2 text-sm text-[#555]">
                {scorecardOnly
                  ? "Shared questions are already filled from your other category — only this category’s scorecard is required."
                  : "Shared details apply to all categories. Already-answered shared sections are skipped; only remaining required questions are shown."}
              </p>
            )}
            {!isDraft && (
              <p className="mt-2 text-sm text-[#555]">
                This nomination is submitted. You can review answers below — editing is locked unless
                the secretariat reopens it.
              </p>
            )}
            {savedAt && (
              <p className="mt-1 text-xs text-[#666]">Draft saved at {savedAt}</p>
            )}
            {submitMsg && <p className="mt-1 text-xs text-[var(--brand-gold-dark)]">{submitMsg}</p>}
            {saveError && <p className="mt-1 text-xs text-red-700">{saveError}</p>}
            {loading && <p className="mt-1 text-xs text-[#666]">Loading…</p>}
          </div>
          <StatusPill status={appMeta.status} />
        </div>

        {siblingApps.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">
              Category scorecards
            </p>
            <div className="flex flex-wrap gap-2">
              {siblingApps.map((sib) => {
                const active = sib.applicationId === appMeta.id;
                const isDraft = sib.status === "DRAFT";
                return (
                  <button
                    key={sib.applicationId}
                    type="button"
                    disabled={active || saving}
                    onClick={() => {
                      const href =
                        sib.status === "DRAFT"
                          ? `/nominate/applications/${sib.applicationId}?focus=scorecard`
                          : `/nominate/applications/${sib.applicationId}?view=status`;
                      if (dirty && isDraft) {
                        void saveDraft()
                          .then(() => router.push(href))
                          .catch(() => router.push(href));
                      } else {
                        router.push(href);
                      }
                    }}
                    className={`min-h-10 border px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] transition ${
                      active
                        ? "border-[#1a1814] bg-[#1a1814] text-white"
                        : "border-black/15 bg-[#f7f4f2] text-[#333] hover:border-[#1a1814]/40"
                    }`}
                  >
                    {sib.categoryTitle}
                    <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal opacity-70">
                      {isDraft
                        ? active
                          ? "Editing scorecard"
                          : "Scorecard pending"
                        : sib.status.replaceAll("_", " ")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 md:hidden">
          <ProgressBar value={loaderValue} />
          <label className="label mt-4">
            Step {activeSteps.indexOf(step) + 1 || 1} of {activeSteps.length}
            {scorecardOnly ? " · Scorecard only" : ""}
          </label>
          <select
            className="input"
            value={step}
            onChange={(e) => {
              tryGoToStep(Number(e.target.value));
            }}
          >
            {applicationSteps
              .filter((s) => activeSteps.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id} disabled={s.id > maxReachableStep}>
                  {String(s.id).padStart(2, "0")} — {s.label}
                  {s.id > maxReachableStep ? " (complete earlier steps first)" : ""}
                </option>
              ))}
          </select>
        </div>
        <div className="mt-4 hidden md:block">
          <ProgressBar value={loaderValue} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <div className="space-y-1 border border-black/10 bg-white p-3">
            {scorecardOnly && (
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-gold-dark)]">
                Shared sections skipped
              </p>
            )}
            {applicationSteps.map((s) => {
              const active = activeSteps.includes(s.id);
              const skipped = multiCategory && !active;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => tryGoToStep(s.id)}
                  disabled={skipped || s.id > maxReachableStep}
                  className={`flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold ${
                    step === s.id
                      ? "bg-black text-white"
                      : skipped
                        ? "cursor-not-allowed text-[#bbb] line-through decoration-[#ccc]"
                        : s.id > maxReachableStep
                          ? "cursor-not-allowed text-[#bbb]"
                          : "text-[#333] hover:bg-black/5"
                  }`}
                >
                  <span
                    className={`w-6 font-display text-xs font-black italic ${
                      step === s.id ? "text-[var(--brand-gold)]" : "text-[#999]"
                    }`}
                  >
                    {String(s.id).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    {s.label}
                    {skipped ? (
                      <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-[#aaa] no-underline">
                        From other category
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="border border-black/10 bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-black italic uppercase sm:text-2xl">
            {String(current.id).padStart(2, "0")}. {current.label}
          </h2>

          <div
            ref={stepRootRef}
            className="min-h-[12rem]"
            onInput={() => {
              setDirty(true);
              if (incompleteBanner) setIncompleteBanner("");
            }}
            onChange={() => {
              setDirty(true);
              if (incompleteBanner) setIncompleteBanner("");
            }}
          >
            {step === 1 && <ProfileStep />}
            {step === 2 && <EligibilityStep answers={answers} />}
            {step === 3 && <OverviewStep answers={answers} />}
            {step === 4 && <PerformanceSection answers={answers} />}
            {step === 5 && (
              <CategoryQuestionsSection
                scorecard={scorecard}
                answers={answers}
                categoryTitle={appMeta.categoryTitle}
              />
            )}
            {step === 6 && <MysuruStep answers={answers} />}
            {step === 7 && <SignatureStep answers={answers} />}
            {step === 8 && (
              <EvidenceSection applicationId={id} onChanged={() => setDirty(true)} />
            )}
            {step === 9 && <DeclarationSection answers={answers} />}
            {step === 10 && (
              <ReviewSection
                applicationId={id}
                categoryTitle={appMeta.categoryTitle}
                answers={answers}
                scorecard={scorecard}
                confirm={confirm}
                canEdit={isDraft}
                otherCategories={siblingApps.filter((s) => s.applicationId !== appMeta.id)}
                buildSubmitPayload={buildSubmitPayload}
                onEditStep={(targetStep) => {
                  const partial = collectStepAnswers();
                  mergeAnswers(partial);
                  setStep(targetStep);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSubmitted={(status) => {
                  setAppMeta((m) => ({
                    ...m,
                    status: status.replaceAll("_", " "),
                    statusRaw: status,
                  }));
                  setDirty(false);
                  const nextDraft = siblingApps.find(
                    (s) => s.applicationId !== appMeta.id && s.status === "DRAFT",
                  );
                  setSubmitMsg(
                    nextDraft
                      ? `Submitted for ${appMeta.categoryTitle}. Next: complete the scorecard for ${nextDraft.categoryTitle}.`
                      : "Nomination submitted — Eligibility Review",
                  );
                  setSiblingApps((list) =>
                    list.map((s) =>
                      s.applicationId === appMeta.id ? { ...s, status } : s,
                    ),
                  );
                }}
              />
            )}
          </div>

          <div className="mobile-sticky-actions">
            {incompleteBanner && (
              <p className="mb-2 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {incompleteBanner}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="btn-ghost order-3 w-full sm:order-1 sm:w-auto"
                onClick={() => {
                  const partial = collectStepAnswers();
                  const merged = mergeAnswers(partial);
                  const prev = prevActiveStep(step, merged, multiCategory);
                  setStep(prev);
                  void saveDraft(merged, prev);
                }}
                disabled={activeSteps[0] === step}
              >
                ← Back
              </button>
              <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center">
                {isDraft && (
                  <button
                    type="button"
                    className="btn-draft w-full sm:w-auto"
                    disabled={saving || !dirty}
                    onClick={() => {
                      void confirmAndSaveDraft();
                    }}
                  >
                    {saving ? "Saving…" : "Save for later"}
                  </button>
                )}
                {!isDraft && (
                  <Link
                    href={`/nominate/applications/${appMeta.id}?view=status`}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    ← Back to status
                  </Link>
                )}
                {isDraft && step !== activeSteps[activeSteps.length - 1] && (
                  <button
                    type="button"
                    className="btn-primary w-full sm:w-auto"
                    onClick={saveContinue}
                  >
                    {scorecardOnly && step === 5 ? "Continue to review →" : "Next step →"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

export default function ApplicationWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <Suspense fallback={<p className="p-6 text-sm text-[#666]">Loading nomination…</p>}>
        <WorkspaceInner params={params} />
      </Suspense>
    </AuthGate>
  );
}

function applicationStatusCopy(app: {
  statusRaw: string;
  adminDecision: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason?: string;
}) {
  if (app.adminDecision === "REJECTED" || app.statusRaw === "NOT_QUALIFIED") {
    return {
      tone: "reject" as const,
      title: "We are not proceeding with this application",
      body:
        app.rejectionReason ||
        "The Awards Secretariat is not proceeding with this nomination.",
    };
  }
  if (app.adminDecision === "ACCEPTED") {
    return {
      tone: "ok" as const,
      title: "Verified — under jury evaluation",
      body: "Admin verified your nomination. Independent jury evaluation is in progress.",
    };
  }
  if (app.statusRaw === "CLARIFICATION_REQUIRED") {
    return {
      tone: "wait" as const,
      title: "Action needed — clarification",
      body: "The secretariat asked for more information. Open Messages to reply and upload what’s requested.",
    };
  }
  if (
    ["SUBMITTED", "ELIGIBILITY_REVIEW", "VERIFICATION", "READY_FOR_JURY"].includes(app.statusRaw)
  ) {
    return {
      tone: "wait" as const,
      title: "Awaiting Admin verification",
      body: "Your nomination is with Admin. It will appear to the jury only after verification.",
    };
  }
  if (["JURY_EVALUATION", "MODERATION_REQUIRED", "FINALIST", "FINAL_ASSESSMENT"].includes(app.statusRaw)) {
    return {
      tone: "ok" as const,
      title: "Under evaluation",
      body: "Your nomination is with the jury / moderation process. Watch Messages for updates.",
    };
  }
  return {
    tone: "wait" as const,
    title: "Nomination received",
    body: "Your submission is in the awards workflow. Status updates will appear here.",
  };
}

function ApplicationStatusView({
  appMeta,
  siblingApps,
  onViewAnswers,
}: {
  appMeta: {
    id: string;
    categoryTitle: string;
    status: string;
    statusRaw: string;
    adminDecision: "PENDING" | "ACCEPTED" | "REJECTED";
    rejectionReason?: string;
    submittedAt?: string;
    verifiedAt?: string;
  };
  siblingApps: {
    applicationId: string;
    categoryTitle: string;
    categorySlug?: string;
    status: string;
  }[];
  onViewAnswers: () => void;
}) {
  const info = applicationStatusCopy(appMeta);
  const toneClass =
    info.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : info.tone === "reject"
        ? "border-red-200 bg-red-50 text-red-950"
        : "border-amber-200 bg-amber-50 text-amber-950";

  const stages = [
    { key: "submitted", label: "Submitted", done: appMeta.statusRaw !== "DRAFT" },
    {
      key: "review",
      label: "Admin review",
      done: ["VERIFICATION", "READY_FOR_JURY", "JURY_EVALUATION", "FINALIST", "FINAL_ASSESSMENT", "RANKING_READY", "RESULT_LOCKED"].includes(
        appMeta.statusRaw,
      ) || appMeta.adminDecision === "ACCEPTED",
    },
    {
      key: "jury",
      label: "Jury evaluation",
      done: ["JURY_EVALUATION", "FINALIST", "FINAL_ASSESSMENT", "RANKING_READY", "RESULT_LOCKED"].includes(
        appMeta.statusRaw,
      ) || appMeta.adminDecision === "ACCEPTED",
    },
    {
      key: "result",
      label: "Result",
      done: ["RANKING_READY", "RESULT_LOCKED"].includes(appMeta.statusRaw),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="border border-black/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
              Application status
            </p>
            <h1 className="mt-1 font-display text-2xl font-black italic uppercase sm:text-3xl">
              {appMeta.categoryTitle}
            </h1>
            <p className="mt-1 text-sm text-[#888]">{appMeta.id}</p>
            {appMeta.submittedAt && (
              <p className="mt-1 text-xs text-[#666]">
                Submitted {new Date(appMeta.submittedAt).toLocaleString()}
              </p>
            )}
            {appMeta.verifiedAt && (
              <p className="mt-0.5 text-xs text-[#666]">
                Verified {new Date(appMeta.verifiedAt).toLocaleString()}
              </p>
            )}
          </div>
          <StatusPill status={appMeta.status} />
        </div>

        <div className={`mt-5 border px-4 py-3 text-sm ${toneClass}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide">{info.title}</p>
          <p className="mt-1 text-sm">{info.body}</p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          {stages.map((s) => (
            <div
              key={s.key}
              className={`border px-3 py-3 text-center ${
                s.done
                  ? "border-[var(--brand-gold)]/50 bg-[#faf6eb]"
                  : "border-black/10 bg-[#f7f4f2]"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#888]">
                {s.done ? "Done" : "Pending"}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {siblingApps.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">
              Your categories
            </p>
            <div
              className={`mt-2 grid gap-2 ${
                siblingApps.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {siblingApps.map((sib) => {
                const active = sib.applicationId === appMeta.id;
                const code =
                  getCategoryBySlug(sib.categorySlug || "")?.code ||
                  awardCategories.find((c) => c.title === sib.categoryTitle)?.code ||
                  "";
                return (
                  <Link
                    key={sib.applicationId}
                    href={
                      sib.status === "DRAFT"
                        ? `/nominate/applications/${sib.applicationId}?focus=scorecard`
                        : `/nominate/applications/${sib.applicationId}?view=status`
                    }
                    className={`relative flex min-h-[7.5rem] flex-col justify-end overflow-hidden border p-3 transition ${
                      active
                        ? "border-[var(--brand-gold)] ring-2 ring-[var(--brand-gold)]"
                        : "border-black/15 hover:border-[var(--brand-gold)]/60"
                    }`}
                  >
                    {code ? (
                      <CategoryBackdrop
                        code={code}
                        className="absolute inset-0 h-full w-full"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#2a1218]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
                    <div className="relative z-[1]">
                      {code ? (
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)]">
                          {code}
                        </p>
                      ) : null}
                      <p className="mt-0.5 font-display text-xs font-bold uppercase leading-snug tracking-tight text-white sm:text-sm">
                        {sib.categoryTitle}
                      </p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/75">
                        {sib.status.replaceAll("_", " ")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/nominate/dashboard" className="btn-secondary">
            ← Dashboard
          </Link>
          {appMeta.statusRaw === "CLARIFICATION_REQUIRED" && (
            <Link href="/nominate/messages" className="btn-primary">
              Open Messages
            </Link>
          )}
          <button type="button" className="btn-ghost" onClick={onViewAnswers}>
            View submitted answers
          </button>
        </div>
      </div>
    </div>
  );
}

function TextBlock({
  title,
  max,
  hint,
  name,
  defaultValue,
  required,
}: {
  title: string;
  max: string;
  hint?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="mt-4">
      <label className="label" htmlFor={name}>
        {title} <span className="font-normal text-[#888]">({max})</span>
        {required ? " *" : ""}
      </label>
      {hint && <p className="mb-2 text-xs text-[#666]">{hint}</p>}
      <textarea
        id={name}
        name={name}
        className="input min-h-32"
        placeholder="Enter response..."
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}

function ProfileStep() {
  const [rows, setRows] = useState<[string, string][]>([]);

  useEffect(() => {
    apiGet<{
      profile: {
        legalName?: string;
        udyam?: string;
        classification?: string;
        mysuruAddress?: string;
        employees?: string;
      } | null;
    }>("/api/profile")
      .then((d) => {
        const p = d.profile;
        if (!p) {
          setRows([]);
          return;
        }
        setRows([
          ["Legal Name", p.legalName || "—"],
          ["Udyam", p.udyam || "—"],
          ["Classification", p.classification || "—"],
          ["Mysuru Operations", p.mysuruAddress || "—"],
          ["Employees", p.employees || "—"],
        ]);
      })
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="text-[#666]">
        Business profile is completed once and reused. Edit details in the Business Profile page if
        needed.
      </p>
      {!rows.length && (
        <p className="text-[#666]">No profile saved yet — complete Business Profile first.</p>
      )}
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-black/5 py-2">
          <span className="text-[#888]">{k}</span>
          <span className="font-semibold text-right">{v}</span>
        </div>
      ))}
      <Link href="/nominate/profile" className="btn-secondary mt-2">
        Edit Business Profile
      </Link>
    </div>
  );
}

function EligibilityStep({ answers }: { answers: Answers }) {
  const items = [
    "Valid Udyam Registration",
    "Substantial Mysuru District operations",
    "Business currently operational",
    "Willing to provide documentary evidence",
  ];
  const [choices, setChoices] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    items.forEach((_, i) => {
      const v = String(answers[`eligibility_${i}`] || "").toLowerCase();
      init[i] = v === "yes" || v === "no" ? v : "";
    });
    return init;
  });

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-[#666]">
        Confirm common eligibility before category questions. Select Yes or No for each. If you
        select No, a reason is required.
      </p>
      {items.map((q, i) => {
        const name = `eligibility_${i}`;
        const reasonName = `eligibility_${i}_reason`;
        const choice = choices[i] || "";
        return (
          <div key={q} className="border border-black/10 px-3 py-3 text-sm">
            <p className="font-medium text-[#1a1814]">
              {q} <span className="text-[#888]">*</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value="yes"
                  required
                  checked={choice === "yes"}
                  onChange={() => setChoices((c) => ({ ...c, [i]: "yes" }))}
                  className="h-4 w-4"
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value="no"
                  required
                  checked={choice === "no"}
                  onChange={() => setChoices((c) => ({ ...c, [i]: "no" }))}
                  className="h-4 w-4"
                />
                No
              </label>
            </div>
            {choice === "no" && (
              <div className="mt-3">
                <label className="label" htmlFor={reasonName}>
                  Reason * (required when No)
                </label>
                <textarea
                  id={reasonName}
                  name={reasonName}
                  className="input min-h-20"
                  required
                  defaultValue={answers[reasonName] || ""}
                  placeholder="Explain why this does not apply / is not available"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OverviewStep({ answers }: { answers: Answers }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-[#666]">
        Fields marked <span className="font-semibold text-[#1a1814]">*</span> are required. Other
        answers help the jury but can be filled later.
      </p>
      <TextBlock
        name="overview_describe"
        title="Describe your business"
        max="200 words"
        defaultValue={answers.overview_describe}
        required
      />
      <TextBlock
        name="overview_products"
        title="Principal products or services"
        max="150 words"
        defaultValue={answers.overview_products}
      />
      <TextBlock
        name="overview_customers"
        title="Principal customers or markets"
        max="150 words"
        defaultValue={answers.overview_customers}
      />
      <TextBlock
        name="overview_differentiates"
        title="What differentiates your organisation?"
        max="200 words"
        defaultValue={answers.overview_differentiates}
      />
      <TextBlock
        name="overview_achievements"
        title="Three most important achievements"
        max="200 words"
        defaultValue={answers.overview_achievements}
      />
    </div>
  );
}

function PerformanceSection({ answers }: { answers: Answers }) {
  const metrics = ["Revenue (₹)", "Profit / EBITDA (₹)", "Employees", "Customers / Clients", "Locations / Markets"];
  const extras = [
    ["perf_investment", "Major investment during assessment period"],
    ["perf_markets", "New markets entered"],
    ["perf_capacity", "Capacity expansion"],
    ["perf_products", "New products / services introduced"],
    ["perf_export", "Export contribution (if applicable)"],
  ] as const;

  return (
    <div className="mt-4">
      <div className="mb-3 bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)]">
        Confidential — Jury & Verification Use Only
      </div>
      <p className="mb-3 text-sm text-[#666]">
        Fields marked <span className="font-semibold text-[#1a1814]">*</span> are required. Only{" "}
        <span className="font-semibold">Revenue · FY-1</span> is mandatory — fill other cells if you
        have them.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-[10px] uppercase tracking-[0.12em] text-[#888]">
              <th className="py-2 pr-4">Metric</th>
              <th className="py-2 pr-4">FY-3</th>
              <th className="py-2 pr-4">FY-2</th>
              <th className="py-2">FY-1</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, mi) => {
              const revenueRequired = mi === 0;
              return (
                <tr key={m} className="border-b border-black/5">
                  <td className="py-2 pr-4 font-medium">
                    {m}
                    {revenueRequired ? (
                      <span className="text-[#1a1814]" aria-hidden>
                        {" "}
                        *
                      </span>
                    ) : null}
                  </td>
                  {[0, 1, 2].map((yi) => {
                    const name = `perf_m${mi}_y${yi}`;
                    const isRequired = revenueRequired && yi === 2;
                    return (
                      <td key={yi} className="py-2 pr-4">
                        <input
                          className="input"
                          name={name}
                          placeholder="—"
                          defaultValue={answers[name] || ""}
                          required={isRequired}
                          aria-required={isRequired}
                          aria-label={
                            isRequired ? `${m} FY-1 (required)` : `${m} FY-${3 - yi}`
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {extras.map(([name, label]) => (
          <div key={name} className={name === "perf_export" ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={name}>
              {label}
            </label>
            <textarea
              id={name}
              name={name}
              className="input min-h-16"
              defaultValue={answers[name] || ""}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryQuestionsSection({
  scorecard,
  answers,
  categoryTitle,
}: {
  scorecard: { name: string; points: number }[];
  answers: Answers;
  categoryTitle: string;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="border border-[var(--brand-gold)]/40 bg-[#faf6eb] px-4 py-3 text-sm text-[#333]">
        <p className="font-semibold uppercase tracking-wide text-[10px] text-[var(--brand-gold-dark)]">
          Category scorecard only
        </p>
        <p className="mt-1">
          These questions are for <span className="font-semibold">{categoryTitle}</span>. Shared
          sections (overview, performance, Mysuru, declaration) already apply to all your
          categories — you do not fill them again.
        </p>
      </div>
      <p className="text-sm text-[#666]">
        Answer at least the first question to continue. Other scorecard answers are optional but
        strengthen this category.
      </p>
      {scorecard.map((c, i) => {
        const name = `category_q_${i}`;
        return (
          <div key={c.name} className="border border-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold uppercase tracking-tight">
                {c.name}
                {i === 0 ? " *" : ""}
              </h3>
              <span className="badge-gold">{c.points} Points</span>
            </div>
            <textarea
              name={name}
              className="input mt-3 min-h-24"
              placeholder="Describe evidence-backed performance (max 300 words)"
              defaultValue={answers[name] || ""}
              required={i === 0}
            />
          </div>
        );
      })}
    </div>
  );
}

function MysuruStep({ answers }: { answers: Answers }) {
  const fields = [
    ["mysuru_employees", "Employees based in Mysuru"],
    ["mysuru_vendors", "Local vendors / suppliers"],
    ["mysuru_sourcing", "Local sourcing (where measurable)"],
    ["mysuru_employment", "Local employment initiatives"],
    ["mysuru_community", "Community contribution"],
    ["mysuru_ecosystem", "Participation in Mysuru business ecosystem"],
  ] as const;

  return (
    <div className="mt-4 space-y-4">
      <TextBlock
        name="mysuru_contribution"
        title="Your Contribution to Mysuru"
        max="250 words"
        hint="Describe employment, suppliers, community, skills or economic contribution."
        defaultValue={answers.mysuru_contribution}
        required
      />
      <p className="text-sm text-[#666]">Optional detail fields — fill what applies.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([name, label]) => (
          <div key={name}>
            <label className="label" htmlFor={name}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              className="input"
              defaultValue={answers[name] || ""}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SignatureStep({ answers }: { answers: Answers }) {
  return (
    <div className="mt-4 space-y-4">
      <TextBlock
        name="signature_achievement"
        title="One Achievement the Jury Should Remember"
        max="200 words"
        defaultValue={answers.signature_achievement}
        required
      />
      <TextBlock
        name="signature_why"
        title="Why does this achievement matter?"
        max="100 words"
        defaultValue={answers.signature_why}
      />
    </div>
  );
}

function EvidenceSection({
  applicationId,
  onChanged,
}: {
  applicationId: string;
  onChanged?: () => void;
}) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busyKey, setBusyKey] = useState("");
  const [msg, setMsg] = useState("");
  const [sizeAlert, setSizeAlert] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadRef = useRef<HTMLInputElement | null>(null);
  // ProcessOverlay locks while busy; only lock here for the size alert dialog
  useBodyScrollLock(Boolean(sizeAlert));

  function load() {
    apiGet<{
      documents: {
        id: string;
        name: string;
        fileName?: string | null;
        evidenceType: string;
      }[];
      mandatory: {
        name: string;
        done: boolean;
        documentId: string | null;
        fileName?: string | null;
      }[];
    }>("/api/documents")
      .then((d) => {
        const uploaded = (d.documents || []).map((x) => ({
          id: x.id,
          name: x.name,
          fileName: x.fileName,
          evidenceType: x.evidenceType,
          done: true,
        }));
        if (uploaded.length) {
          setDocs(uploaded);
          return;
        }
        setDocs(
          (d.mandatory || []).map((m) => ({
            id: m.documentId || undefined,
            name: m.name,
            fileName: m.fileName,
            evidenceType: "Statutory",
            done: m.done,
          })),
        );
      })
      .catch(() => setDocs([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadFile(opts: {
    name: string;
    evidenceType: string;
    file: File;
    description?: string;
  }) {
    const token = getToken();
    const fd = new FormData();
    fd.append("file", opts.file);
    fd.append("name", opts.name);
    fd.append("evidenceType", opts.evidenceType);
    fd.append("period", "Current");
    fd.append("description", opts.description || `Evidence · ${opts.name}`);
    fd.append("visibility", "Confidential");
    if (applicationId) fd.append("applicationId", applicationId);

    const res = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
    }
    return data;
  }

  async function onPickFile(
    key: string,
    name: string,
    evidenceType: string,
    file: File | null,
  ) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setSizeAlert(
        `Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. It should be less than ${MAX_UPLOAD_MB} MB.`,
      );
      return;
    }
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setSizeAlert("Only PDF format is supported. Please upload a .pdf file.");
      return;
    }
    setBusyKey(key);
    setMsg("");
    try {
      await uploadFile({ name, evidenceType, file });
      setBusyKey("");
      onChanged?.();
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
      setBusyKey("");
    }
  }

  async function markNa(key: string, name: string, evidenceType: string) {
    setBusyKey(key);
    setMsg("");
    try {
      await apiPost("/api/documents/na", {
        name,
        evidenceType,
        applicationId,
      });
      setBusyKey("");
      setDocs((prev) =>
        prev.map((d) =>
          (d.id || d.name) === key || d.name === name
            ? { ...d, done: true, fileName: "N/A" }
            : d,
        ),
      );
      onChanged?.();
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not mark as N/A");
      setBusyKey("");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <ProcessOverlay open={Boolean(busyKey)} />
      {sizeAlert && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-none bg-[#1a1814]/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setSizeAlert(null)}
          onWheel={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md border border-[#e8a914]/35 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(26,24,20,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-black italic uppercase text-[#1a1814]">
              File too large
            </h2>
            <p className="mt-3 text-sm text-[#444]">{sizeAlert}</p>
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn-primary" onClick={() => setSizeAlert(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-[#666]">
        Link each claim to a document: Claim → Evidence → Jury Score. Use{" "}
        <span className="font-semibold">N/A</span> if a document is not available. PDF only · max{" "}
        {MAX_UPLOAD_MB} MB per file.
      </p>
      {msg && (
        <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{msg}</p>
      )}
      {docs.map((d) => {
        const key = d.id || d.name;
        const busy = busyKey === key;
        const isNa = d.fileName === "N/A";
        return (
          <div
            key={key}
            className="flex flex-wrap items-center justify-between gap-3 border border-black/10 bg-[#f7f4f2] px-4 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-[#666]">
                {d.evidenceType} · Confidential
                {isNa
                  ? " · Marked N/A"
                  : d.fileName
                    ? ` · ${d.fileName}`
                    : d.done === false
                      ? " · Pending"
                      : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!isNa && (
                <button
                  type="button"
                  className="btn-ghost !min-h-8 !px-2 !text-[10px]"
                  disabled={busy}
                  onClick={() => void markNa(key, d.name, d.evidenceType || "Other")}
                >
                  N/A
                </button>
              )}
              <label className="btn-ghost cursor-pointer !min-h-8 !px-2 !text-[10px]">
                {busy ? "…" : isNa || d.done === false || !d.fileName ? "Upload" : "Replace"}
                <input
                  ref={(el) => {
                    fileRefs.current[key] = el;
                  }}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    void onPickFile(key, d.name, d.evidenceType || "Other", file);
                  }}
                />
              </label>
            </div>
          </div>
        );
      })}
      {!docs.length && (
        <p className="text-sm text-[#666]">No documents yet — upload evidence below.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <label className="btn-secondary inline-flex cursor-pointer">
          {busyKey === "__new__" ? "Uploading…" : "Upload Evidence"}
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={busyKey === "__new__"}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (!file) return;
              const base = file.name.replace(/\.[^.]+$/, "") || "Evidence";
              void onPickFile("__new__", base, "Other", file);
            }}
          />
        </label>
        <Link href="/nominate/documents" className="btn-ghost inline-flex">
          Manage all documents
        </Link>
      </div>
    </div>
  );
}

function formatSystemDateTime(d = new Date()) {
  return d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SystemDateTimeDisplay({ label = "Date & time" }: { label?: string }) {
  const [now, setNow] = useState(() => formatSystemDateTime());

  useEffect(() => {
    const tick = () => setNow(formatSystemDateTime());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div>
      <p className="label">{label}</p>
      <div className="border border-black/10 bg-[#f7f4f2] px-3 py-3 text-sm font-semibold text-[#1a1814]">
        {now}
      </div>
      <p className="mt-1 text-xs text-[#666]">
        Shown from this device. Exact date and time are captured automatically when you submit.
      </p>
    </div>
  );
}

function DeclarationSection({ answers }: { answers: Answers }) {
  const items = [
    "Information provided is accurate to the best of my knowledge.",
    "Supporting documents are authentic.",
    "I am authorized to submit this application.",
    "The Awards Secretariat may verify material claims.",
    "Material legal/regulatory matters affecting eligibility have been disclosed.",
    "I understand that false or misleading information may result in disqualification.",
    "I accept the Award Rules & Regulations and Privacy Policy.",
    "I understand that sponsorship does not influence award results.",
  ];

  const previouslyAgreed =
    answers.decl_agree === "yes" ||
    items.every((_, i) => answers[`decl_${i}`] === "yes");

  return (
    <div className="mt-4 space-y-4 text-sm">
      <p className="text-[#666]">Please read all declarations carefully before confirming.</p>
      <ol className="list-decimal space-y-2 border border-black/10 bg-[#f7f4f2] px-5 py-4 pl-9">
        {items.map((d) => (
          <li key={d} className="leading-relaxed text-[#333]">
            {d}
          </li>
        ))}
      </ol>
      <label className="flex items-start gap-3 border border-black/10 bg-white px-4 py-3">
        <input
          type="checkbox"
          name="decl_agree"
          required
          defaultChecked={previouslyAgreed}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span className="font-semibold">
          I have read and agree to all of the above declarations. *
        </span>
      </label>
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="decl_signatory">
            Authorized Signatory Name *
          </label>
          <input
            id="decl_signatory"
            name="decl_signatory"
            className="input"
            defaultValue={answers.decl_signatory || ""}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="decl_designation">
            Designation
          </label>
          <input
            id="decl_designation"
            name="decl_designation"
            className="input"
            defaultValue={answers.decl_designation || ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="decl_place">
            Place
          </label>
          <input
            id="decl_place"
            name="decl_place"
            className="input"
            defaultValue={answers.decl_place || ""}
          />
        </div>
        <SystemDateTimeDisplay label="Date & time (system)" />
      </div>
    </div>
  );
}

function ReviewSection({
  applicationId,
  categoryTitle,
  answers,
  scorecard,
  confirm,
  canEdit,
  otherCategories = [],
  onEditStep,
  buildSubmitPayload,
  onSubmitted,
}: {
  applicationId: string;
  categoryTitle: string;
  answers: Answers;
  scorecard: { name: string; points: number }[];
  confirm: (options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
  canEdit: boolean;
  otherCategories?: { applicationId: string; categoryTitle: string; status: string }[];
  onEditStep: (step: number) => void;
  buildSubmitPayload: () => Promise<{
    step: number;
    answers: Answers;
    documents: unknown[];
    savedAt: string;
    submittedFromReview: boolean;
  }>;
  onSubmitted: (status: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successDetail, setSuccessDetail] = useState("");
  const [nextScorecard, setNextScorecard] = useState<{
    applicationId: string;
    categoryTitle: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [missingFix, setMissingFix] = useState<{
    label: string;
    step: number;
    stepLabel: string;
  } | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [docs, setDocs] = useState<{ name: string; fileName?: string | null }[]>([]);
  useBodyScrollLock(busy);
  useBodyScrollLock(successOpen);

  useEffect(() => {
    apiGet<{ profile: BusinessProfile | null }>("/api/profile")
      .then((d) => setProfile(d.profile))
      .catch(() => setProfile(null));
    apiGet<{
      documents: { name: string; fileName?: string | null }[];
      mandatory: { name: string; done: boolean; fileName?: string | null }[];
    }>("/api/documents")
      .then((d) => {
        const uploaded = (d.documents || []).map((x) => ({
          name: x.name,
          fileName: x.fileName,
        }));
        if (uploaded.length) {
          setDocs(uploaded);
        } else {
          setDocs(
            (d.mandatory || [])
              .filter((m) => m.done)
              .map((m) => ({ name: m.name, fileName: m.fileName })),
          );
        }
      })
      .catch(() => setDocs([]));
  }, []);

  async function requestEdit(label: string, targetStep: number) {
    if (!canEdit) return;
    const ok = await confirm({
      title: "Are you sure?",
      message: `Do you want to make changes on “${label}”? You will be taken to that page to edit.`,
      confirmLabel: "Yes, edit",
      cancelLabel: "Cancel",
    });
    if (ok) onEditStep(targetStep);
  }

  const overviewRows: [string, string][] = [
    ["Describe your business", answers.overview_describe],
    ["Principal products or services", answers.overview_products],
    ["Principal customers or markets", answers.overview_customers],
    ["What differentiates your organisation?", answers.overview_differentiates],
    ["Three most important achievements", answers.overview_achievements],
  ];

  const mysuruRows: [string, string][] = [
    ["Contribution to Mysuru", answers.mysuru_contribution],
    ["Employees based in Mysuru", answers.mysuru_employees],
    ["Local vendors / suppliers", answers.mysuru_vendors],
    ["Local sourcing", answers.mysuru_sourcing],
    ["Local employment initiatives", answers.mysuru_employment],
    ["Community contribution", answers.mysuru_community],
    ["Mysuru business ecosystem", answers.mysuru_ecosystem],
  ];

  const profileRows: [string, string][] = profile
    ? [
        ["Legal Business Name", profile.legalName],
        ["Brand / Trade Name", profile.brandName],
        ["Constitution", profile.constitution],
        ["Established", profile.established],
        ["Industry", profile.industry],
        ["Activity", profile.activity],
        ["Udyam", profile.udyam],
        ["Classification", profile.classification],
        ["PAN", profile.pan],
        ["GSTIN", profile.gstin],
        ["Employees", profile.employees],
        ["Mysuru Address", profile.mysuruAddress],
        ["Representative", `${profile.repName} · ${profile.repDesignation}`],
        ["Contact", `${profile.repEmail} · ${profile.repMobile}`],
      ]
    : [];

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-[#666]">
        Review your nomination as an A4 sheet before final submission.
        {canEdit
          ? " Use the pencil on any section to go back and edit before you submit."
          : ""}
      </p>

      <div className="mx-auto w-full max-w-[210mm] overflow-hidden border border-black/20 bg-[#f0eee9] p-3 sm:p-5 print:border-0 print:bg-white print:p-0">
        <article className="a4-sheet mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[12mm] py-[14mm] text-[#1a1814] shadow-[0_12px_40px_-18px_rgba(0,0,0,0.35)] print:shadow-none">
          <header className="border-b-2 border-[#1a1814] pb-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#888]">
              Mysuru MSME Awards 2026
            </p>
            <h3 className="mt-1 font-display text-2xl font-black italic uppercase leading-tight">
              Nomination Summary
            </h3>
            <div className="mt-3 inline-flex max-w-full flex-col gap-1 border border-[var(--brand-gold)]/50 bg-[var(--brand-gold)]/10 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                {otherCategories.length ? "Submitting for category" : "Chosen category"}
              </p>
              <p className="font-display text-base font-black italic uppercase leading-snug">
                {categoryTitle}
              </p>
              <p className="text-[10px] text-[#666]">{applicationId}</p>
              {otherCategories.length > 0 && (
                <p className="mt-1 text-[10px] text-[#555]">
                  Also participating in:{" "}
                  {otherCategories.map((c) => c.categoryTitle).join(" · ")}
                </p>
              )}
            </div>
          </header>

          <SheetSection
            title="1. Business Profile"
            onEdit={canEdit ? () => void requestEdit("Business Profile", 1) : undefined}
          >
            {profileRows.length ? (
              <SheetGrid rows={profileRows} />
            ) : (
              <p className="text-xs text-[#888]">No profile saved.</p>
            )}
          </SheetSection>

          <SheetSection
            title="2. Business Overview"
            onEdit={canEdit ? () => void requestEdit("Business Overview", 3) : undefined}
          >
            <SheetNarrative rows={overviewRows} />
          </SheetSection>

          <SheetSection
            title="3. Category Responses"
            onEdit={canEdit ? () => void requestEdit("Category Responses", 5) : undefined}
          >
            {scorecard.length ? (
              <SheetNarrative
                rows={scorecard.map(
                  (c, i) => [c.name, answers[`category_q_${i}`] || ""] as [string, string],
                )}
              />
            ) : (
              <p className="text-xs text-[#888]">No category questions.</p>
            )}
          </SheetSection>

          <SheetSection
            title="4. Mysuru Contribution"
            onEdit={canEdit ? () => void requestEdit("Mysuru Contribution", 6) : undefined}
          >
            <SheetNarrative rows={mysuruRows} />
          </SheetSection>

          <SheetSection
            title="5. Signature Achievement"
            onEdit={canEdit ? () => void requestEdit("Signature Achievement", 7) : undefined}
          >
            <SheetNarrative
              rows={[
                ["Achievement", answers.signature_achievement],
                ["Why it matters", answers.signature_why],
              ]}
            />
          </SheetSection>

          <SheetSection
            title="6. Uploaded Documents"
            onEdit={canEdit ? () => void requestEdit("Uploaded Documents", 8) : undefined}
          >
            {docs.length ? (
              <ul className="space-y-1.5 text-xs">
                {docs.map((d) => (
                  <li
                    key={`${d.name}-${d.fileName}`}
                    className="flex gap-2 border-b border-dashed border-black/10 py-1.5"
                  >
                    <span className="min-w-0 flex-1 font-semibold">{d.name}</span>
                    <span className="shrink-0 text-[#555]">{d.fileName || "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#888]">No documents uploaded.</p>
            )}
          </SheetSection>

          <SheetSection
            title="7. Declaration"
            onEdit={canEdit ? () => void requestEdit("Declaration", 9) : undefined}
          >
            <SheetGrid
              rows={[
                ["Authorized Signatory", answers.decl_signatory],
                ["Designation", answers.decl_designation],
                ["Place", answers.decl_place],
                [
                  "Date & time",
                  answers.decl_date || "Captured automatically on submit",
                ],
              ]}
            />
          </SheetSection>

          <footer className="mt-8 border-t border-black/15 pt-3 text-[9px] uppercase tracking-[0.14em] text-[#888]">
            Applicant review copy · Not an official award certificate
          </footer>
        </article>
      </div>

      <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Ready to Submit? Once submitted, major application information cannot be edited unless the
        Awards Secretariat formally reopens the application.
      </div>
      {error && (
        <div className="space-y-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          {missingFix && canEdit && (
            <button
              type="button"
              className="btn-primary !min-h-9 !text-[10px]"
              onClick={() => onEditStep(missingFix.step)}
            >
              Go to {missingFix.stepLabel}
              {missingFix.label ? ` · ${missingFix.label}` : ""} →
            </button>
          )}
          {!missingFix && error.toLowerCase().includes("documents") && (
            <Link href="/nominate/documents" className="btn-primary !min-h-9 !text-[10px] inline-flex">
              Go to Documents →
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/nominate/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
        {canEdit && (
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              const draftSiblings = otherCategories.filter((c) => c.status === "DRAFT");
              const nextDraft = draftSiblings[0] || null;
              const ok = await confirm({
                title: "Are you sure?",
                message: otherCategories.length
                  ? `Submit the “${categoryTitle}” scorecard for eligibility review? Shared organisation answers stay synced. ${
                      nextDraft
                        ? `Afterwards you can complete the scorecard for “${nextDraft.categoryTitle}”.`
                        : "If another category is still in draft, open its scorecard next."
                    }`
                  : "Submit this application for eligibility review? Your answers, declaration, and uploaded document list will be saved to the database first. After submit, major details cannot be edited unless the Awards Secretariat reopens it.",
                confirmLabel: "Yes, submit",
                cancelLabel: "Cancel",
              });
              if (!ok) return;
              setBusy(true);
              setError("");
              setMissingFix(null);
              try {
                const draftJson = await buildSubmitPayload();
                const missing = missingNominationFields(
                  draftJson.answers || {},
                  scorecard.length,
                );
                if (missing.length) {
                  const first = missing[0];
                  setMissingFix({
                    label: first,
                    step: stepForMissingField(first),
                    stepLabel: stepLabelForMissingField(first),
                  });
                  setError(
                    `Please complete all sections before submit. Still missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
                  );
                  setBusy(false);
                  return;
                }
                const docsCheck = await apiGet<{
                  completeCount: number;
                  totalMandatory: number;
                  mandatory: { name: string; done: boolean }[];
                }>("/api/documents");
                if (
                  docsCheck.totalMandatory > 0 &&
                  docsCheck.completeCount < docsCheck.totalMandatory
                ) {
                  const pending = (docsCheck.mandatory || [])
                    .filter((m) => !m.done)
                    .map((m) => m.name);
                  setMissingFix(null);
                  setError(
                    `Complete remaining documents first (${docsCheck.completeCount}/${docsCheck.totalMandatory}). Pending: ${pending.join(", ")}. Upload on Documents, then return here.`,
                  );
                  setBusy(false);
                  return;
                }
                const res = await apiPost<{ application: { status: string } }>(
                  `/api/applications/${applicationId}/submit`,
                  { draftJson },
                );
                onSubmitted(res.application.status);
                const docCount = Array.isArray(draftJson.documents)
                  ? draftJson.documents.length
                  : 0;
                const answerCount = Object.keys(draftJson.answers || {}).length;
                setNextScorecard(
                  nextDraft
                    ? {
                        applicationId: nextDraft.applicationId,
                        categoryTitle: nextDraft.categoryTitle,
                      }
                    : null,
                );
                setSuccessDetail(
                  nextDraft
                    ? `“${categoryTitle}” is in Eligibility Review. Shared answers are already on your other draft. Next: complete the scorecard for “${nextDraft.categoryTitle}” only — you do not fill the whole form again.`
                    : `All details are stored. ${answerCount} form fields and ${docCount} document record${docCount === 1 ? "" : "s"} saved. Status: Eligibility Review.`,
                );
                setSuccessOpen(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Submit failed — nothing was finalized");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Please wait…" : `Submit · ${categoryTitle}`}
          </button>
        )}
      </div>

      {busy && <ProcessOverlay open={busy} />}

      {successOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto overscroll-none bg-[#1a1814]/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setSuccessOpen(false)}
          onWheel={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md border border-[#e8a914]/35 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(26,24,20,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-1 w-full bg-gradient-to-r from-[#1a1814] via-[#e8a914] to-[#f5d56a]"
              aria-hidden
            />
            <h2 className="mt-4 font-display text-xl font-black italic uppercase text-[#1a1814]">
              {nextScorecard ? "Scorecard submitted" : "Application submitted"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#444]">{successDetail}</p>
            <p className="mt-2 text-sm text-[#666]">
              {categoryTitle} · {applicationId}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link href="/nominate/dashboard" className="btn-secondary text-center">
                Go to Dashboard
              </Link>
              {nextScorecard ? (
                <Link
                  href={`/nominate/applications/${nextScorecard.applicationId}?focus=scorecard`}
                  className="btn-primary text-center"
                >
                  Complete scorecard · {nextScorecard.categoryTitle}
                </Link>
              ) : (
                <button type="button" className="btn-primary" onClick={() => setSuccessOpen(false)}>
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SheetSection({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-1">
        <h4 className="font-display text-sm font-black italic uppercase tracking-tight">{title}</h4>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-black/15 text-[#333] transition hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/15 hover:text-[#1a1814] print:hidden"
            title={`Edit ${title}`}
            aria-label={`Edit ${title}`}
          >
            <Pencil size={14} strokeWidth={2.25} aria-hidden />
          </button>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SheetGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#888]">{k}</dt>
          <dd className="mt-0.5 break-words text-xs font-semibold">{v?.trim() || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function SheetNarrative({ rows }: { rows: [string, string][] }) {
  return (
    <div className="space-y-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#888]">{k}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-[#222]">
            {v?.trim() || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
