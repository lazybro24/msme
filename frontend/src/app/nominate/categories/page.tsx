"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { applicantNav, PortalShell } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { IncompleteGateDialog } from "@/components/portal/IncompleteGate";
import { useUnsavedProcessGuard } from "@/hooks/UnsavedProcessContext";
import { usePageProcess } from "@/hooks/PageProcessContext";
import { CategoryBackdrop } from "@/components/awards/CategoryIcon";
import { getDirectApplyCategories, awardCategories, type AwardCategory } from "@/content/awards";
import { mandatoryDocuments } from "@/content/requiredDocuments";
import { apiPost, apiGet, getStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const blockShapes: Record<
  string,
  { span: string; minH: string; radius: string }
> = {
  MOTY: {
    span: "col-span-12 min-[480px]:col-span-7 min-[480px]:row-span-2",
    minH: "min-h-[9.5rem] min-[480px]:min-h-full",
    radius: "rounded-none",
  },
  MFG: {
    span: "col-span-6 min-[480px]:col-span-5",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[11rem]",
    radius: "rounded-tl-2xl min-[480px]:rounded-tl-3xl",
  },
  SRV: {
    span: "col-span-6 min-[480px]:col-span-5",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[11rem]",
    radius: "rounded-br-2xl min-[480px]:rounded-br-3xl",
  },
  EMG: {
    span: "col-span-6 min-[480px]:col-span-4",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[10rem]",
    radius: "rounded-tr-2xl min-[480px]:rounded-tr-[2rem]",
  },
  INN: {
    span: "col-span-6 min-[480px]:col-span-4",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[10rem]",
    radius: "rounded-bl-2xl min-[480px]:rounded-bl-3xl",
  },
  GRW: {
    span: "col-span-12 min-[480px]:col-span-4",
    minH: "min-h-[7.75rem] min-[480px]:min-h-[10rem]",
    radius: "rounded-none",
  },
  WEN: {
    span: "col-span-6",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[10rem]",
    radius: "rounded-t-2xl min-[480px]:rounded-t-[1.75rem]",
  },
  YEN: {
    span: "col-span-6",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[10rem]",
    radius: "rounded-r-2xl min-[480px]:rounded-r-3xl",
  },
  SSI: {
    span: "col-span-6",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[10rem]",
    radius: "rounded-2xl min-[480px]:rounded-[1.75rem]",
  },
  EMP: {
    span: "col-span-6",
    minH: "min-h-[8.25rem] min-[480px]:min-h-[10rem]",
    radius: "rounded-b-2xl min-[480px]:rounded-b-[2rem]",
  },
};

function CategoryInner() {
  const categories = getDirectApplyCategories();
  const allBlocks = [
    awardCategories.find((c) => c.code === "MOTY")!,
    ...categories,
  ];
  const pageProcess = usePageProcess();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finderOpen, setFinderOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsFocusSlugs, setDocsFocusSlugs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadingApps, setLoadingApps] = useState(true);
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [highlightCats, setHighlightCats] = useState(false);
  const [spotlight, setSpotlight] = useState(false);
  const [activity, setActivity] = useState("");
  const [age, setAge] = useState("");
  const [pride, setPride] = useState("");
  const [womanLed, setWomanLed] = useState("");
  const [young, setYoung] = useState("");
  const cueStartedRef = useRef(false);

  const categoryDirty =
    !locked &&
    !loadingApps &&
    (selected.length > 0 || Boolean(activity || age || pride || womanLed || young));

  const allowNavRef = useRef(() => undefined as void);
  const { allowNextNavigation } = useUnsavedProcessGuard({
    dirty: categoryDirty,
    onSave: async () => {
      if (locked) return;
      const user = getStoredUser();
      const newSlugs = selected.filter((s) => !existingSlugs.includes(s));
      if (!newSlugs.length) return;
      const categoriesPayload = newSlugs.map((slug) => {
        const c = categories.find((x) => x.slug === slug)!;
        return {
          categoryCode: c.code,
          categorySlug: c.slug,
          categoryTitle: c.title,
        };
      });
      await apiPost("/api/applications/batch", {
        categories: categoriesPayload,
        organisationName: user?.orgName,
      });
      setExistingSlugs(selected);
      setLocked(selected.length >= 2);
    },
  });
  allowNavRef.current = allowNextNavigation;

  async function persistCategories(goNext: boolean) {
    if (locked) {
      if (goNext) {
        allowNavRef.current();
        pageProcess.navigate("/nominate/documents", "Loading documents…");
      }
      return;
    }
    const newSlugs = selected.filter((s) => !existingSlugs.includes(s));
    if (!selected.length || (!newSlugs.length && !existingSlugs.length)) {
      if (!goNext) return;
      setHighlightCats(true);
      setIncompleteOpen(true);
      return;
    }
    if (!newSlugs.length) {
      if (goNext) {
        allowNavRef.current();
        pageProcess.navigate("/nominate/documents", "Loading documents…");
      }
      return;
    }
    setBusy(true);
    setError("");
    pageProcess.begin("Saving categories…");
    try {
      const user = getStoredUser();
      const categoriesPayload = newSlugs.map((slug) => {
        const c = categories.find((x) => x.slug === slug)!;
        return {
          categoryCode: c.code,
          categorySlug: c.slug,
          categoryTitle: c.title,
        };
      });
      await apiPost("/api/applications/batch", {
        categories: categoriesPayload,
        organisationName: user?.orgName,
      });
      setExistingSlugs(selected);
      setLocked(selected.length >= 2);
      setBusy(false);
      if (goNext) {
        allowNavRef.current();
        pageProcess.navigate("/nominate/documents", "Loading documents…");
      } else {
        pageProcess.end();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save categories");
      setBusy(false);
      pageProcess.end();
    }
  }

  async function saveCategories() {
    await persistCategories(true);
  }

  useEffect(() => {
    apiGet<{ complete: boolean }>("/api/profile")
      .then((d) => setProfileReady(d.complete))
      .catch(() => setProfileReady(false));
  }, []);

  useEffect(() => {
    apiGet<{ applications: { categorySlug: string }[] }>("/api/applications")
      .then((d) => {
        const apps = d.applications ?? [];
        const slugs = apps.map((a) => a.categorySlug).filter(Boolean);
        if (slugs.length > 0) {
          setSelected(slugs);
          setExistingSlugs(slugs);
        }
        // Lock only when the 2-application limit is reached
        setLocked(apps.length >= 2);
      })
      .catch(() => {
        /* keep editable until save */
      })
      .finally(() => setLoadingApps(false));
  }, []);

  const recommendations = useMemo(() => {
    if (!activity || !pride) return [];
    const scored = categories.map((c) => {
      let score = 0;
      if (activity === "Manufacturing" && c.code === "MFG") score += 3;
      if (activity === "Services" && c.code === "SRV") score += 3;
      if (pride === "Manufacturing" && c.code === "MFG") score += 2;
      if (pride === "Innovation" && c.code === "INN") score += 3;
      if (pride === "Growth" && c.code === "GRW") score += 3;
      if (pride === "Customer Service" && c.code === "SRV") score += 2;
      if (pride === "People Practices" && c.code === "EMP") score += 3;
      if (pride === "Sustainability" && c.code === "SSI") score += 3;
      if (pride === "Entrepreneurship" && (c.code === "WEN" || c.code === "YEN" || c.code === "EMG"))
        score += 1;
      if (age === "1-5" && c.code === "EMG") score += 3;
      if (age === "5+" && c.code === "GRW") score += 1;
      if (womanLed === "Yes" && c.code === "WEN") score += 3;
      if (young === "Yes" && c.code === "YEN") score += 3;
      return { ...c, score };
    });
    return scored
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((c, i) => ({
        ...c,
        match: i === 0 ? "Strong Match" : "Potential Match",
      }));
  }, [categories, activity, age, pride, womanLed, young]);

  function toggle(slug: string) {
    if (locked) return;
    if (selected.includes(slug)) {
      // Keep already-saved applications selected
      if (existingSlugs.includes(slug)) return;
      setSelected((prev) => prev.filter((s) => s !== slug));
      return;
    }
    if (selected.length >= 2) return;
    setSelected((prev) => [...prev, slug]);
    openDocsPreview([slug]);
  }

  function applyRecommendations() {
    if (locked) return;
    const room = Math.max(0, 2 - existingSlugs.length);
    const extras = recommendations
      .map((r) => r.slug)
      .filter((s) => !existingSlugs.includes(s))
      .slice(0, room);
    setSelected([...existingSlugs, ...extras]);
    setFinderOpen(false);
    try {
      void apiPost("/api/profile/recommendations", { slugs: [...existingSlugs, ...extras] });
    } catch {
      /* optional */
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Open Category Finder when the page loads
  useEffect(() => {
    if (!mounted || locked || loadingApps || cueStartedRef.current) return;
    cueStartedRef.current = true;
    setFinderOpen(true);
  }, [mounted, locked, loadingApps]);

  useEffect(() => {
    if (finderOpen) setSpotlight(false);
  }, [finderOpen]);

  useEffect(() => {
    if (!finderOpen && !spotlight && !docsOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [finderOpen, spotlight, docsOpen]);

  function dismissFinderCue() {
    setSpotlight(false);
  }

  function openDocsPreview(slugs: string[]) {
    setDocsFocusSlugs(slugs);
    setDocsOpen(true);
    setSpotlight(false);
  }

  const docsFocusCategories = useMemo(
    () =>
      docsFocusSlugs
        .map((slug) => awardCategories.find((c) => c.slug === slug))
        .filter((c): c is AwardCategory => Boolean(c)),
    [docsFocusSlugs],
  );

  const docsPreviewCount = useMemo(() => {
    const evidenceCount = selected
      .map((slug) => awardCategories.find((c) => c.slug === slug)?.evidence.length ?? 0)
      .reduce((a, b) => a + b, 0);
    return mandatoryDocuments.length + evidenceCount;
  }, [selected]);

  return (
    <PortalShell
      brand="Applicant Portal"
      subtitle="Category Selection · Max 2"
      nav={applicantNav}
      userLabel="Applicant"
    >
      <IncompleteGateDialog
        open={incompleteOpen}
        missingCount={1}
        title="Category required"
        allowSkip={false}
        message="Select at least one award category before continuing. Incomplete selection is highlighted in red."
        onStay={() => setIncompleteOpen(false)}
      />

      {profileReady === null ? (
        <p className="text-sm text-[#666]">Checking profile…</p>
      ) : !profileReady ? (
        <div className="mx-auto max-w-xl border border-black/10 bg-white p-6 text-center sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
            Step 2 required
          </p>
          <h1 className="mt-2 font-display text-2xl font-black italic uppercase">
            Complete Business Profile First
          </h1>
          <p className="mt-3 text-sm text-[#666]">
            Create your account details on the Business Profile page before selecting award
            categories and submitting a nomination.
          </p>
          <Link href="/nominate/profile" className="btn-primary mt-6 inline-flex">
            Go to Business Profile
          </Link>
        </div>
      ) : (
      <div className="space-y-5">
        <div className="text-center">
          <h1 className="font-display text-lg font-black italic uppercase tracking-tight sm:text-xl">
            Select Award Categories
          </h1>
          <p className="mt-1 text-xs text-[#666] sm:text-sm">
            {locked
              ? "Your categories are saved and locked (2/2). Selection cannot be changed."
              : existingSlugs.length
                ? `Participating in ${existingSlugs.length} categor${existingSlugs.length === 1 ? "y" : "ies"} already. You can add ${2 - existingSlugs.length} more (max 2), then save.`
                : (
                <>
                  Choose up to 2 award categories for one nomination. Shared answers are filled
                  once; only category scorecard questions differ. Click{" "}
                  <span className="font-semibold text-[var(--brand-gold-dark)]">!</span> for
                  recommendations.
                </>
              )}
          </p>
        </div>

        {/* Blur + FAB tip cue (portaled above page isolate stacking) */}
        {mounted &&
          !finderOpen &&
          !docsOpen &&
          !locked &&
          createPortal(
            <>
              {spotlight && (
                <button
                  type="button"
                  className="finder-spotlight"
                  aria-label="Dismiss tip"
                  onClick={dismissFinderCue}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  dismissFinderCue();
                  setFinderOpen(true);
                }}
                className={cn(
                  "finder-fab group fixed bottom-5 right-5 flex flex-col items-center gap-2 sm:bottom-6 sm:right-6",
                  spotlight ? "z-[60] finder-fab--spotlight" : "z-40",
                )}
                aria-label="Find what fits you — open category recommendations"
              >
                <span
                  className={cn(
                    "finder-fab__label pointer-events-none max-w-[11rem]",
                    spotlight
                      ? "finder-fab__label--cue"
                      : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100",
                  )}
                >
                  <span className="finder-fab__label-box inline-block border border-[var(--brand-gold)]/50 bg-[#1a0c10] px-3 py-2 text-center text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-white">
                    Not sure?
                    <br />
                    Find what fits you
                  </span>
                </span>
                <span className="finder-fab__btn relative flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16">
                  <span className="finder-fab__pulse" aria-hidden />
                  <span className="finder-fab__ring" aria-hidden />
                  <span className="relative z-[1] font-display text-3xl font-black italic leading-none text-[#1a0c10] sm:text-4xl">
                    !
                  </span>
                </span>
              </button>
            </>,
            document.body,
          )}

        {mounted &&
          finderOpen &&
          createPortal(
            <div
              className="finder-modal fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="finder-title"
            >
              <button
                type="button"
                className="absolute inset-0 bg-[#0d0507]/75 backdrop-blur-[2px]"
                aria-label="Close finder"
                onClick={() => setFinderOpen(false)}
              />
              <div className="finder-modal__panel relative z-[1] flex w-full max-w-4xl flex-col overflow-hidden border border-[var(--brand-gold)]/35 bg-white shadow-[0_28px_60px_-20px_rgba(0,0,0,0.55)] sm:max-h-[min(88vh,720px)]">
                <div className="finder-modal__pad shrink-0 border-b border-black/10 bg-gradient-to-r from-[#1a0a0e] via-[#2a1218] to-[#1a0a0e] py-5 text-white sm:py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 pr-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold)]">
                        Category Finder
                      </p>
                      <h2
                        id="finder-title"
                        className="mt-1.5 font-display text-xl font-black italic uppercase tracking-tight sm:text-2xl"
                      >
                        Choose What Fits You
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">
                        Answer a few questions — we&apos;ll recommend matching awards (max 2 to
                        apply).
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center border border-white/25 text-white transition hover:border-[var(--brand-gold)] hover:text-[var(--brand-gold)]"
                      aria-label="Close"
                      onClick={() => setFinderOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden">
                  <div className="finder-modal__pad min-h-0 min-w-0 space-y-5 overflow-y-auto overscroll-contain border-r border-black/10 py-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                      Your business
                    </p>
                    <FinderField
                      label="What best describes your organisation?"
                      value={activity}
                      onChange={setActivity}
                      options={["Manufacturing", "Services", "Other"]}
                    />
                    <FinderField
                      label="How old is the enterprise?"
                      value={age}
                      onChange={setAge}
                      options={["Under 1 year", "1-5", "5+"]}
                    />
                    <FinderField
                      label="What achievement are you most proud of?"
                      value={pride}
                      onChange={setPride}
                      options={[
                        "Growth",
                        "Innovation",
                        "Customer Service",
                        "Manufacturing",
                        "People Practices",
                        "Sustainability",
                        "Entrepreneurship",
                      ]}
                    />
                    <FinderField
                      label="Is the enterprise actively led by a woman entrepreneur?"
                      value={womanLed}
                      onChange={setWomanLed}
                      options={["Yes", "No"]}
                    />
                    <FinderField
                      label="Is the nominated entrepreneur aged 35 or below?"
                      value={young}
                      onChange={setYoung}
                      options={["Yes", "No"]}
                    />
                  </div>

                  <div className="flex min-h-0 min-w-0 flex-col bg-[#f7f4f2]">
                    <div className="finder-modal__pad min-h-0 flex-1 overflow-y-auto overscroll-contain py-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                        Recommendations
                      </p>
                      <h3 className="mt-1.5 font-display text-lg font-black italic uppercase">
                        Recommended for You
                      </h3>
                      {!recommendations.length ? (
                        <div className="mt-6 border border-dashed border-black/15 bg-white/70 px-5 py-10 text-center sm:px-6 sm:py-12">
                          <p className="font-display text-3xl font-black italic text-[var(--brand-gold)]/40">
                            !
                          </p>
                          <p className="mt-3 text-sm leading-relaxed text-[#666]">
                            Complete the questions to see which awards fit best.
                          </p>
                        </div>
                      ) : (
                        <ul className="mt-5 space-y-3.5">
                          {recommendations.map((r, i) => (
                            <li
                              key={r.slug}
                              className="border border-black/10 border-l-4 border-l-[var(--brand-gold)] bg-white p-4 sm:p-5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold-dark)]">
                                  {r.match}
                                </p>
                                <span className="font-display text-sm font-black italic text-black/20">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                              </div>
                              <p className="mt-1.5 font-display text-sm font-bold uppercase leading-snug">
                                {r.title}
                              </p>
                              <p className="mt-1.5 text-sm leading-relaxed text-[#666]">{r.tagline}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-5 text-xs leading-relaxed text-[#888]">
                        MSME of the Year is qualification-based and cannot be selected here.
                      </p>
                    </div>
                    <div className="finder-modal__pad shrink-0 border-t border-black/10 bg-white py-4 sm:py-5">
                      <button
                        type="button"
                        className="btn-primary w-full"
                        disabled={!recommendations.length}
                        onClick={applyRecommendations}
                      >
                        {recommendations.length
                          ? "Use Top Matches (max 2)"
                          : "Answer questions to continue"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {mounted &&
          docsOpen &&
          createPortal(
            <div
              className="finder-modal docs-preview fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="docs-preview-title"
            >
              <button
                type="button"
                className="absolute inset-0 bg-[#0d0507]/75 backdrop-blur-[2px]"
                aria-label="Close documents preview"
                onClick={() => setDocsOpen(false)}
              />
              <div className="finder-modal__panel relative z-[1] flex w-full max-w-2xl flex-col overflow-hidden border border-[var(--brand-gold)]/35 bg-white shadow-[0_28px_60px_-20px_rgba(0,0,0,0.55)] sm:max-h-[min(88vh,720px)]">
                <div className="finder-modal__pad shrink-0 border-b border-black/10 bg-gradient-to-r from-[#1a0a0e] via-[#2a1218] to-[#1a0a0e] py-5 text-white sm:py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 pr-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold)]">
                        {docsFocusCategories.length === 1
                          ? `${docsFocusCategories[0].number} · ${docsFocusCategories[0].code}`
                          : "Selected categories"}
                      </p>
                      <h2
                        id="docs-preview-title"
                        className="mt-1.5 font-display text-xl font-black italic uppercase tracking-tight sm:text-2xl"
                      >
                        {docsFocusCategories.length === 1
                          ? docsFocusCategories[0].title
                          : "Documents & Evidence"}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">
                        {docsFocusCategories.length === 1
                          ? docsFocusCategories[0].tagline
                          : "Mandatory proof for all applicants, plus evidence for your selected awards."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center border border-white/25 text-white transition hover:border-[var(--brand-gold)] hover:text-[var(--brand-gold)]"
                      aria-label="Close"
                      onClick={() => setDocsOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="finder-modal__pad min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-6">
                  {docsFocusCategories.map((cat) => (
                    <section key={`${cat.slug}-details`} className="space-y-4">
                      {docsFocusCategories.length > 1 && (
                        <h3 className="font-display text-base font-black italic uppercase text-[#1a0c10]">
                          {cat.title}
                        </h3>
                      )}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                          Award details
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#444]">{cat.overview}</p>
                        {cat.whoShouldApply.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {cat.whoShouldApply.map((item) => (
                              <li key={item} className="text-sm leading-snug text-[#555]">
                                <span className="mr-2 text-[var(--brand-gold-dark)]">·</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                          Category-specific achievement &amp; evidence requirements
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-[#666]">
                          Provide relevant documents demonstrating achievements in this category.
                          Equivalent supporting evidence may be accepted, subject to verification.
                        </p>
                        <div className="mt-3 overflow-x-auto border border-black/10">
                          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                            <thead className="bg-[#1a0c10] text-white">
                              <tr>
                                <th className="w-10 px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em]">
                                  No.
                                </th>
                                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em]">
                                  Supporting evidence document
                                </th>
                                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em]">
                                  Purpose
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.supportingEvidence.map((item, i) => (
                                <tr
                                  key={item.document}
                                  className="border-t border-black/10 odd:bg-[#f7f4f2] even:bg-white"
                                >
                                  <td className="px-2 py-2.5 align-top text-[11px] font-bold text-[var(--brand-gold-dark)]">
                                    {i + 1}
                                  </td>
                                  <td className="px-3 py-2.5 align-top text-[13px] leading-snug text-[#333]">
                                    {item.document}
                                  </td>
                                  <td className="px-3 py-2.5 align-top text-[12px] leading-snug text-[#666]">
                                    {item.purpose}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {cat.recommendedAdditional && (
                          <p className="mt-3 text-xs leading-relaxed text-[#666]">
                            <span className="font-semibold text-[#333]">Recommended additional: </span>
                            {cat.recommendedAdditional}
                          </p>
                        )}
                        {cat.juryFocus && (
                          <p className="mt-2 text-xs leading-relaxed text-[#666]">
                            <span className="font-semibold text-[#333]">Jury focus: </span>
                            {cat.juryFocus}
                          </p>
                        )}
                        {cat.evidenceNotes?.map((note) => (
                          <p
                            key={note}
                            className="mt-2 border border-[var(--brand-gold)]/30 bg-[#fff8e8] px-3 py-2 text-xs leading-relaxed text-[#555]"
                          >
                            <span className="font-semibold text-[#333]">Important: </span>
                            {note}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}

                  <section>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                      Section A — Basic business documents
                    </p>
                    <p className="mt-1.5 text-xs text-[#666]">
                      Upload once for all categories (shared across nominations).
                    </p>
                    <ul className="mt-3 space-y-2">
                      {mandatoryDocuments.map((doc) => (
                        <li
                          key={doc.name}
                          className="border border-black/10 border-l-4 border-l-[var(--brand-gold)] bg-[#f7f4f2] px-3 py-2.5 text-sm text-[#333]"
                        >
                          <span className="font-medium">{doc.name}</span>
                          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">
                            {doc.evidenceType}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <div className="finder-modal__pad shrink-0 border-t border-black/10 bg-[#f7f4f2] py-4 sm:py-5">
                  <p className="text-xs leading-relaxed text-[#666]">
                    Category selected. Uploads happen later on Documents and Supporting Evidence —
                    this popup is a preview only.
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setDocsOpen(false)}
                    >
                      Got it — continue selecting
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}

        <div
          className={cn(
            "category-blocks grid auto-rows-[minmax(8.25rem,auto)] grid-cols-12 gap-2 min-[480px]:auto-rows-[minmax(10rem,auto)] min-[480px]:gap-3 min-[480px]:py-1",
            highlightCats && !selected.length && "rounded-sm ring-2 ring-red-500 ring-offset-2",
          )}
        >
          {allBlocks.map((c) => {
            const shape = blockShapes[c.code] ?? {
              span: "col-span-6",
              minH: "min-h-[8.25rem]",
              radius: "",
            };
            const selectable = c.directApply;
            const on = selected.includes(c.slug);
            const atLimit = !locked && selectable && selected.length >= 2 && !on;
            const recommended = !locked && recommendations.some((r) => r.slug === c.slug);

            if (!selectable) {
              return (
                <div
                  key={c.slug}
                  className={cn(
                    "category-block relative overflow-hidden border border-[var(--brand-gold)]/45 shadow-[3px_4px_0_rgba(26,12,16,0.12)] transition",
                    shape.span,
                    shape.minH,
                    shape.radius,
                  )}
                >
                  <CategoryBackdrop code={c.code} className="absolute inset-0 h-full w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
                  <div className="relative z-[1] flex h-full flex-col justify-between p-3 max-[479px]:p-2.5 sm:p-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold)] min-[480px]:text-[10px]">
                      {c.number} · {c.code} · Locked
                    </p>
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-black uppercase italic tracking-tight text-white min-[480px]:text-lg sm:text-xl">
                        {c.title}
                      </h2>
                      <div className="mt-2 min-[480px]:mt-2.5">
                        <CategorySwapFaces
                          tagline="Qualification-based — not open for direct nomination. Strong performers from other categories may be considered."
                          evidence={c.evidence}
                          staggerMs={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const blockIndex = allBlocks.findIndex((b) => b.slug === c.slug);

            return (
              <div
                key={c.slug}
                className={cn(
                  "category-block group relative overflow-hidden border text-left shadow-[3px_4px_0_rgba(26,12,16,0.1)] transition",
                  shape.span,
                  shape.minH,
                  shape.radius,
                  on
                    ? "z-[2] border-[var(--brand-gold)] shadow-[4px_5px_0_rgba(232,169,20,0.45)] ring-2 ring-[var(--brand-gold)]"
                    : "border-black/20 hover:z-[1] hover:border-[var(--brand-gold)]/70 hover:shadow-[5px_6px_0_rgba(26,12,16,0.16)]",
                  !locked && atLimit && "opacity-50",
                  locked && !on && "opacity-40",
                )}
              >
                <CategoryBackdrop
                  code={c.code}
                  className={cn(
                    "absolute inset-0 h-full w-full transition duration-300",
                    on ? "scale-105" : "group-hover:scale-105",
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0 transition",
                    on
                      ? "bg-gradient-to-t from-black/85 via-black/45 to-black/15"
                      : "bg-gradient-to-t from-black/80 via-black/40 to-black/10 group-hover:from-black/75",
                  )}
                />
                <button
                  type="button"
                  onClick={() => toggle(c.slug)}
                  disabled={locked || atLimit}
                  aria-pressed={on}
                  className={cn(
                    "relative z-[1] flex h-full w-full flex-col justify-between p-3 text-left max-[479px]:p-2.5 sm:p-5",
                    (locked || atLimit) && "cursor-not-allowed",
                  )}
                >
                  <div className="flex items-start justify-between gap-1.5 min-[480px]:gap-2">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)] min-[480px]:text-[10px] min-[480px]:tracking-[0.14em]">
                        {c.number} · {c.code}
                      </p>
                      {recommended && (
                        <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#f5d56a] min-[480px]:text-[9px]">
                          Recommended
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-bold transition min-[480px]:h-6 min-[480px]:w-6 min-[480px]:text-xs",
                        on
                          ? "border-[var(--brand-gold)] bg-[var(--brand-gold)] text-[#1a0c10]"
                          : "border-white/40 bg-black/25 text-transparent",
                      )}
                      aria-hidden
                    >
                      {on ? "✓" : ""}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-xs font-bold uppercase leading-snug tracking-tight text-white min-[480px]:text-sm sm:text-base">
                      {c.title}
                    </p>
                    <div className="mt-1.5 min-[480px]:mt-2">
                      <CategorySwapFaces
                        tagline={c.tagline}
                        evidence={c.evidence}
                        staggerMs={(Math.max(blockIndex, 0) % 5) * 700}
                      />
                    </div>
                    <p
                      className={cn(
                        "mt-2 text-[10px] font-bold uppercase tracking-[0.12em]",
                        on ? "text-[var(--brand-gold)]" : "text-white/55",
                      )}
                    >
                      {locked
                        ? on
                          ? "Saved · Locked"
                          : "Not selected"
                        : on
                          ? "Selected"
                          : atLimit
                            ? "Limit reached"
                            : "Tap to select"}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--brand-gold)]/35 bg-[#1a0c10] px-4 py-3 text-white sm:px-5">
            <p className="text-sm leading-snug">
              You&apos;ll need{" "}
              <span className="font-semibold text-[var(--brand-gold)]">{docsPreviewCount}</span>{" "}
              document types for your selection (mandatory + category evidence).
            </p>
            <button
              type="button"
              className="shrink-0 border border-[var(--brand-gold)]/60 bg-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)] transition hover:bg-[var(--brand-gold)] hover:text-[#1a0c10]"
              onClick={() => openDocsPreview(selected)}
            >
              View required docs
            </button>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border border-black/10 bg-white p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[#333]">
              {locked ? "Saved categories: " : "Selected: "}
              <span className="text-[var(--brand-gold-dark)]">{selected.length} / 2</span>
            </p>
            {selected.length > 0 && (
              <p className="mt-0.5 text-xs text-[#777]">
                {categories
                  .filter((c) => selected.includes(c.slug))
                  .map((c) => c.code)
                  .join(" · ")}
                {locked ? " · Locked" : ""}
              </p>
            )}
          </div>
          {locked ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                allowNavRef.current();
                pageProcess.navigate("/nominate/documents", "Loading documents…");
              }}
            >
              Continue to Documents
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={busy || loadingApps}
              onClick={() => void saveCategories()}
            >
              {busy ? "Saving…" : "Save & Continue"}
            </button>
          )}
        </div>
      </div>
      )}
    </PortalShell>
  );
}

function CategorySwapFaces({
  tagline,
  evidence,
  staggerMs = 0,
  intervalMs = 5000,
}: {
  tagline: string;
  evidence: string[];
  staggerMs?: number;
  intervalMs?: number;
}) {
  const slides = useMemo(
    () => [
      { kind: "award" as const, label: "Award", text: tagline },
      {
        kind: "docs" as const,
        label: "Docs & evidence",
        text:
          evidence.length > 0
            ? `${evidence.length} category evidence areas · select to view requirements`
            : `${mandatoryDocuments.length} mandatory uploads for every applicant`,
      },
    ],
    [tagline, evidence],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let intervalId = 0;
    const startId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setIndex((i) => (i + 1) % 2);
      }, intervalMs);
    }, staggerMs);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(intervalId);
    };
  }, [intervalMs, staggerMs]);

  const slide = slides[index] ?? slides[0];

  return (
    <div className="category-swap" aria-live="polite">
      <div key={`${slide.kind}-${index}`} className="category-swap__face">
        <p className="category-swap__label">{slide.label}</p>
        <p className="category-swap__text">{slide.text}</p>
      </div>
      <div className="category-swap__dots" aria-hidden>
        {slides.map((s, i) => (
          <span
            key={s.kind}
            className={cn("category-swap__dot", i === index && "category-swap__dot--on")}
          />
        ))}
      </div>
    </div>
  );
}

function FinderField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="finder-modal__field space-y-2">
      <label className="label !mb-0">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CategorySelectPage() {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <CategoryInner />
    </AuthGate>
  );
}
