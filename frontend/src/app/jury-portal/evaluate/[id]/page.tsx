"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { PortalShell, juryNav } from "@/components/portal/PortalShell";
import { awardCategories, getCategoryBySlug } from "@/content/awards";
import { apiGet, apiPost, getStoredUser, API_URL } from "@/lib/api";
import { AuthGate } from "@/components/portal/AuthGate";

const scale = [
  ["No Evidence / Not Demonstrated", "0%"],
  ["Very Limited", "20%"],
  ["Basic", "40%"],
  ["Good", "60%"],
  ["Very Good", "80%"],
  ["Exceptional / Benchmark", "100%"],
];

type DossierField = { label: string; value: string; fileUrl?: string; fileName?: string };
type DossierSection = { key: string; label: string; ready: boolean; fields: DossierField[] };

type DossierPayload = {
  application: {
    applicationId: string;
    categoryCode: string;
    categorySlug: string;
    categoryTitle: string;
    organisationName?: string;
    sector?: string;
    msme?: string;
    status: string;
    progress: number;
    evaluationDeadline?: string;
  };
  organisation: {
    legalName: string;
    brandName?: string | null;
    industry?: string | null;
    activity?: string | null;
    classification?: string | null;
    udyam?: string | null;
    employees?: string | null;
    mysuruAddress?: string | null;
    website?: string | null;
  } | null;
  evaluation: {
    lockedAt: string | null;
    totalScore: number | null;
    recommendation: string | null;
    overall: string | null;
    strengths: string | null;
    concerns: string | null;
    scores: { name: string; points: number; score: number; comment?: string }[] | null;
    conflictCleared: boolean;
    reopenPending: boolean;
  } | null;
  dossierSections: DossierSection[];
  aggregation?: {
    scores?: { judge?: string | null; score: number | null; reopenPending?: boolean }[];
    average?: number;
    median?: number;
    variance?: number;
    moderationRequired?: boolean;
    count?: number;
  } | null;
  conductAccepted?: boolean;
};

function EvaluateInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = getStoredUser();
  const isChair = Boolean(user?.roles?.includes("JURY_CHAIR") || user?.roles?.includes("ADMINISTRATOR"));
  const [data, setData] = useState<DossierPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("snapshot");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overall, setOverall] = useState("");
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [locked, setLocked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reopenAsked, setReopenAsked] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyTitle, setClarifyTitle] = useState("");
  const [clarifyMsg, setClarifyMsg] = useState("");
  const [clarifyBusy, setClarifyBusy] = useState(false);

  const category =
    (data
      ? awardCategories.find((c) => c.code === data.application.categoryCode) ||
        getCategoryBySlug(data.application.categorySlug)
      : null) ?? getCategoryBySlug("manufacturing-excellence")!;
  const scorecard = category.criteria;

  function hydrateEvaluation(d: DossierPayload) {
    if (d.evaluation?.scores && Array.isArray(d.evaluation.scores)) {
      const map: Record<string, number> = {};
      const cMap: Record<string, string> = {};
      d.evaluation.scores.forEach((s) => {
        map[s.name] = s.score;
        if (s.comment) cMap[s.name] = s.comment;
      });
      setScores(map);
      setComments(cMap);
    }
    if (d.evaluation) {
      setOverall(d.evaluation.overall || "");
      setStrengths(d.evaluation.strengths || "");
      setConcerns(d.evaluation.concerns || "");
      setRecommendation(d.evaluation.recommendation || "");
      setLocked(Boolean(d.evaluation.lockedAt));
      setReopenAsked(Boolean(d.evaluation.reopenPending));
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setActiveSection("snapshot");
    apiGet<DossierPayload>(`/api/evaluations/${id}/dossier`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        if (!d.conductAccepted && !user?.roles?.includes("ADMINISTRATOR")) {
          setError("conduct");
          return;
        }
        hydrateEvaluation(d);
        const firstReady = d.dossierSections.find((s) => s.ready)?.key;
        if (firstReady) setActiveSection(firstReady);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dossier");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally only when application id changes (user.roles is a new array every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const total = useMemo(
    () => scorecard.reduce((sum, c) => sum + (scores[c.name] ?? 0), 0),
    [scores, scorecard],
  );
  const unscored = scorecard.filter((c) => scores[c.name] === undefined);
  const allScored = unscored.length === 0;

  function needsComment(name: string, points: number) {
    const score = scores[name];
    if (score === undefined) return false;
    return (
      score === 0 ||
      score === points ||
      score / points >= 0.8 ||
      score / points <= 0.2
    );
  }

  const missingComments = scorecard.filter(
    (c) => needsComment(c.name, c.points) && !(comments[c.name] || "").trim(),
  );

  const canSubmit =
    allScored &&
    missingComments.length === 0 &&
    overall.trim() &&
    strengths.trim() &&
    concerns.trim() &&
    Boolean(recommendation) &&
    confirmed;

  const blockers = [
    ...(!allScored ? [`Score all criteria (${unscored.length} remaining)`] : []),
    ...(missingComments.length
      ? [`Add required evaluator comments (${missingComments.length})`]
      : []),
    ...(!overall.trim() ? ["Fill overall assessment"] : []),
    ...(!strengths.trim() ? ["Fill top strengths"] : []),
    ...(!concerns.trim() ? ["Fill key concerns"] : []),
    ...(!recommendation ? ["Select a finalist recommendation"] : []),
    ...(!confirmed ? ["Confirm independent evaluation"] : []),
  ];

  async function saveDraft() {
    setSaveBusy(true);
    setDraftMsg("");
    try {
      await apiPost(`/api/evaluations/${id}/draft`, {
        scores: scorecard.map((c) => ({
          name: c.name,
          points: c.points,
          score: scores[c.name] ?? 0,
          comment: comments[c.name] || undefined,
        })),
        totalScore: total,
        overall,
        strengths,
        concerns,
        recommendation: recommendation || undefined,
      });
      setDraftMsg("Progress saved — resume anytime from My Evaluations.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Draft save failed";
      setDraftMsg(msg);
      alert(msg);
    } finally {
      setSaveBusy(false);
    }
  }

  async function submitClarify() {
    setClarifyBusy(true);
    try {
      await apiPost("/api/clarifications", {
        applicationId: id,
        type: "Jury Query",
        title: clarifyTitle.trim() || "Jury clarification request",
        message: clarifyMsg.trim(),
      });
      setClarifyOpen(false);
      setClarifyTitle("");
      setClarifyMsg("");
      alert("Clarification sent to nominee.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setClarifyBusy(false);
    }
  }

  async function submitEvaluation() {
    if (blockers.length) {
      alert(`Complete these before submitting:\n• ${blockers.join("\n• ")}`);
      return;
    }
    setSubmitBusy(true);
    setDraftMsg("");
    try {
      await apiPost(`/api/evaluations/${id}`, {
        scores: scorecard.map((c) => ({
          name: c.name,
          points: c.points,
          score: scores[c.name] ?? 0,
          comment: comments[c.name] || undefined,
        })),
        totalScore: total,
        overall,
        strengths,
        concerns,
        recommendation,
        confirmIndependent: true,
      });
      setLocked(true);
      alert("Evaluation submitted successfully.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitBusy(false);
    }
  }

  if (loading) {
    return (
      <PortalShell brand="Jury Portal" subtitle="Evaluate" nav={juryNav} userLabel={user?.fullName ?? "Jury"}>
        <p className="text-sm text-[#666]">Loading nominee dossier…</p>
      </PortalShell>
    );
  }

  if (error === "conduct") {
    return (
      <PortalShell brand="Jury Portal" subtitle="Evaluate" nav={juryNav} userLabel={user?.fullName ?? "Jury"}>
        <div className="border border-amber-200 bg-amber-50 p-6 text-center">
          <h1 className="font-display text-xl font-black italic uppercase">Code of Conduct required</h1>
          <p className="mt-2 text-sm text-[#555]">Accept the Code of Conduct before evaluating.</p>
          <Link href="/jury-portal/conduct" className="btn-primary mt-4 inline-flex">
            Open Code of Conduct
          </Link>
        </div>
      </PortalShell>
    );
  }

  if (error || !data) {
    return (
      <PortalShell brand="Jury Portal" subtitle="Evaluate" nav={juryNav} userLabel={user?.fullName ?? "Jury"}>
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error || "Application not found"}
        </p>
        <Link href="/jury-portal" className="btn-secondary mt-4 inline-flex">
          Back to evaluations
        </Link>
      </PortalShell>
    );
  }

  const org = data.organisation;
  const section = data.dossierSections.find((s) => s.key === activeSection);

  return (
    <PortalShell
      brand="Jury Portal"
      subtitle={`Evaluate ${data.application.applicationId}`}
      nav={juryNav}
      userLabel={user?.fullName ?? "Jury"}
    >
      {/* Equal-height dossier: left list · right details */}
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        <div className="flex h-full flex-col border border-black/10 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
            Nominee dossier
          </p>
          <h1 className="mt-2 font-display text-2xl font-black italic uppercase">
            {data.application.applicationId}
          </h1>
          <p className="mt-1 text-sm font-semibold">
            {data.application.organisationName || org?.legalName}
          </p>
          <p className="mt-1 text-sm text-[#666]">{data.application.categoryTitle}</p>
          <p className="mt-1 text-xs text-[#888]">
            {data.application.sector || org?.industry || "—"}
            {data.application.msme ? ` · ${data.application.msme}` : ""}
          </p>
          {data.application.evaluationDeadline && (
            <p className="mt-3 text-xs font-semibold text-[var(--brand-gold-dark)]">
              Deadline · {data.application.evaluationDeadline}
            </p>
          )}

          <ul className="mt-4 space-y-1.5 text-sm">
            {data.dossierSections.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={`flex w-full items-center justify-between border px-3 py-2 text-left transition ${
                    activeSection === item.key
                      ? "border-[#e8a914] bg-[#faf6eb] text-[#1a1814]"
                      : item.ready
                        ? "border-[#e8a914]/30 bg-white text-[#1a1814] hover:bg-[#faf6eb]/70"
                        : "border-black/5 bg-[#f7f4f2] text-[#666]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">
                    {item.ready ? "Ready" : "Pending"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-4">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setClarifyOpen((v) => !v)}
            >
              {clarifyOpen ? "Cancel clarification" : "Request clarification"}
            </button>
            {clarifyOpen && (
              <div className="mt-3 space-y-2 border border-black/10 bg-[#f7f4f2] p-3">
                <input
                  className="input"
                  placeholder="Title"
                  value={clarifyTitle}
                  onChange={(e) => setClarifyTitle(e.target.value)}
                />
                <textarea
                  className="input min-h-20"
                  placeholder="What do you need from the nominee?"
                  value={clarifyMsg}
                  onChange={(e) => setClarifyMsg(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={clarifyBusy || clarifyMsg.trim().length < 5}
                  onClick={submitClarify}
                >
                  {clarifyBusy ? "Sending…" : "Send to nominee"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          id="dossier-detail"
          className="flex h-full min-h-[28rem] flex-col border border-black/10 bg-white p-5 sm:p-6 md:min-h-0"
        >
          {section ? (
            <>
              <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                Section detail
              </p>
              <h2 className="mt-1 shrink-0 font-display text-2xl font-black italic uppercase">
                {section.label}
              </h2>

              {section.key === "evidence" ? (
                !section.fields.length ? (
                  <p className="mt-6 flex-1 text-sm text-[#666]">
                    No supporting documents uploaded by the nominee yet.
                  </p>
                ) : (
                  <div className="mt-6 flex min-h-0 flex-1 flex-col">
                    <p className="shrink-0 text-sm text-[#666]">
                      Documents uploaded by the nominee. Open each file to review evidence.
                    </p>
                    <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {section.fields.map((f, i) => {
                        const href = f.fileUrl
                          ? f.fileUrl.startsWith("http")
                            ? f.fileUrl
                            : `${API_URL}${f.fileUrl}`
                          : null;
                        return (
                          <div
                            key={`${section.key}-${f.label}-${i}`}
                            className="flex flex-wrap items-start justify-between gap-3 border border-black/10 bg-[#faf6eb]/40 px-4 py-3"
                          >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#1a0c10]">{f.label}</p>
                            {f.fileName && (
                              <p className="mt-0.5 text-xs font-medium text-[var(--brand-gold-dark)]">
                                {f.fileName}
                              </p>
                            )}
                            <p className="mt-1 text-sm text-[#555]">{f.value}</p>
                          </div>
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary shrink-0 !min-h-9 !px-3 !text-[10px]"
                              >
                                Open document
                              </a>
                            ) : (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-[#888]">
                                No file linked
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : !section.fields.length ? (
                <p className="mt-6 flex-1 text-sm text-[#666]">
                  No content available for this section yet.
                </p>
              ) : (
                <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto text-sm pr-1">
                  {section.fields.map((f, i) => (
                    <div key={`${section.key}-${f.label}-${i}`} className="border-b border-black/5 pb-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#888]">
                        {f.label}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-medium text-[#1a0c10]">{f.value}</p>
                      {f.fileUrl && (
                        <a
                          href={f.fileUrl.startsWith("http") ? f.fileUrl : `${API_URL}${f.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-bold text-[var(--brand-gold-dark)] underline"
                        >
                          Open file
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#666]">Select a dossier section on the left.</p>
          )}
        </div>
      </div>

      {/* Evaluation form below */}
      <div id="evaluation-form" className="mt-6 space-y-6">
        <div className="border border-black/10 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-black italic uppercase">
              Evaluation Scorecard
            </h2>
            <span className="badge-gold">Total: {total} / 100</span>
          </div>

          <div className="mt-4 border border-black/5 bg-[#faf6eb] px-4 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
              Scoring scale
            </h3>
            <ul className="mt-2 grid gap-1 text-xs text-[#666] sm:grid-cols-2 lg:grid-cols-3">
              {scale.map(([l, p]) => (
                <li key={l} className="flex justify-between gap-2">
                  <span>{l}</span>
                  <span className="font-semibold text-black">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 space-y-4">
            {scorecard.map((c) => {
              const stepPts = c.points / 5;
              const options = [0, 1, 2, 3, 4, 5].map((i) => Math.round(i * stepPts * 10) / 10);
              const score = scores[c.name];
              const commentRequired = needsComment(c.name, c.points);
              return (
                <div key={c.name} className="border border-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold uppercase tracking-tight">
                      {c.name}
                    </h3>
                    <span className="text-sm text-[#888]">Max {c.points}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {options.map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={locked}
                        onClick={() => setScores((s) => ({ ...s, [c.name]: v }))}
                        className={`px-3 py-1.5 text-xs font-bold ${
                          scores[c.name] === v ? "bg-black text-white" : "bg-[#f7f4f2] text-[#333]"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <label className="label mt-3 mb-1 block">
                    Evaluator comment
                    {commentRequired && (
                      <span className="ml-0.5 text-red-600" aria-hidden>
                        *
                      </span>
                    )}
                  </label>
                  <textarea
                    className={`input ${
                      commentRequired && !(comments[c.name] || "").trim()
                        ? "border-red-300 focus:border-red-500"
                        : ""
                    }`}
                    disabled={locked}
                    required={commentRequired}
                    value={comments[c.name] || ""}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [c.name]: e.target.value }))
                    }
                    placeholder={
                      commentRequired
                        ? "Comment required for exceptional high/low scores"
                        : "Evaluator comment"
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-3 border-t border-black/10 pt-6">
            <h3 className="font-display text-lg font-black italic uppercase">Final assessment</h3>
            <div>
              <label className="label">Overall Assessment</label>
              <textarea
                className="input min-h-20"
                disabled={locked}
                value={overall}
                onChange={(e) => setOverall(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Top Strengths</label>
                <textarea
                  className="input"
                  disabled={locked}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Key Concerns</label>
                <textarea
                  className="input"
                  disabled={locked}
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Finalist Recommendation</label>
              <select
                className="input"
                disabled={locked}
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
              >
                <option value="">Select</option>
                <option>Strongly Recommend</option>
                <option>Recommend</option>
                <option>Neutral</option>
                <option>Do Not Recommend</option>
              </select>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={locked}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I confirm that I evaluated this application independently and considered the available
              evidence.
            </label>

            {locked ? (
              <div className="space-y-3">
                <div className="bg-black px-4 py-3 text-sm text-[var(--brand-gold)]">
                  SCORE LOCKED
                  {data.evaluation?.totalScore != null ? ` · ${data.evaluation.totalScore}` : ""} —
                  edits require audited reopen request.
                </div>
                {reopenAsked ? (
                  <p className="text-sm text-[#666]">
                    Reopen request sent to Chair / Administrator.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        await apiPost(`/api/evaluations/${id}/reopen`, {
                          reason: "Data entry correction required",
                        });
                        setReopenAsked(true);
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  >
                    Request Score Reopen
                  </button>
                )}
                <Link href="/jury-portal" className="btn-ghost">
                  Back to My Evaluations
                </Link>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {blockers.length > 0 && (
                  <ul className="space-y-1 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <li className="font-semibold">Complete these to submit:</li>
                    {blockers.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={saveBusy || submitBusy}
                    onClick={() => void saveDraft()}
                  >
                    {saveBusy ? "Saving…" : "Save & resume later"}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!canSubmit || saveBusy || submitBusy}
                    onClick={() => void submitEvaluation()}
                    title={
                      canSubmit
                        ? "Submit evaluation"
                        : "Complete all required fields to enable submit"
                    }
                  >
                    {submitBusy ? "Submitting…" : "Submit Evaluation"}
                  </button>
                </div>
                {draftMsg && (
                  <p className="text-xs font-medium text-[var(--brand-gold-dark)]">{draftMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {isChair && data.aggregation?.scores && (
          <div className="border border-black/10 bg-white p-5">
            <h2 className="font-display text-lg font-black italic uppercase">Peer scores</h2>
            <p className="mt-1 text-xs text-[#666]">Visible to Jury Chair</p>
            <ul className="mt-3 space-y-2 text-sm">
              {data.aggregation.scores.map((s, i) => (
                <li key={i} className="flex justify-between border-b border-black/5 py-1">
                  <span>{s.judge || "Judge"}</span>
                  <span className="font-bold">{s.score ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

export default function EvaluatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AuthGate roles={["JURY", "JURY_CHAIR", "ADMINISTRATOR"]} loginPath="/jury-portal/login">
      <EvaluateInner params={params} />
    </AuthGate>
  );
}
