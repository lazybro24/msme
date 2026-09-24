"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { applicantNav, PortalShell } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { IncompleteGateDialog } from "@/components/portal/IncompleteGate";
import { useUnsavedProcessGuard } from "@/hooks/UnsavedProcessContext";
import { CategoryBackdrop } from "@/components/awards/CategoryIcon";
import { getDirectApplyCategories, awardCategories } from "@/content/awards";
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
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finderOpen, setFinderOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadingApps, setLoadingApps] = useState(true);
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [highlightCats, setHighlightCats] = useState(false);
  const [activity, setActivity] = useState("");
  const [age, setAge] = useState("");
  const [pride, setPride] = useState("");
  const [womanLed, setWomanLed] = useState("");
  const [young, setYoung] = useState("");

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
        router.push("/nominate/documents");
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
        router.push("/nominate/documents");
      }
      return;
    }
    setBusy(true);
    setError("");
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
        router.push("/nominate/documents");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save categories");
      setBusy(false);
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
    setSelected((prev) => {
      if (prev.includes(slug)) {
        // Keep already-saved applications selected
        if (existingSlugs.includes(slug)) return prev;
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 2) return prev;
      return [...prev, slug];
    });
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

  useEffect(() => {
    if (!finderOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [finderOpen]);

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
                ? `You already have ${existingSlugs.length} application${existingSlugs.length === 1 ? "" : "s"}. Select ${2 - existingSlugs.length} more (max 2), then save.`
                : (
                <>
                  Max 2 awards can be selected. Click on{" "}
                  <span className="font-semibold text-[var(--brand-gold-dark)]">!</span> for
                  recommendations. Save to lock your choice.
                </>
              )}
          </p>
        </div>

        {/* Floating finder FAB — bottom right */}
        {!finderOpen && !locked && (
          <button
            type="button"
            onClick={() => setFinderOpen(true)}
            className="finder-fab group fixed bottom-5 right-5 z-40 flex items-end gap-0 sm:bottom-6 sm:right-6"
            aria-label="Find what fits you — open category recommendations"
          >
            <span className="finder-fab__label pointer-events-none mb-2 mr-2 hidden max-w-[11rem] translate-x-2 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block">
              <span className="inline-block border border-[#1a0c10]/15 bg-[#1a0c10] px-3 py-2 text-left text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-white shadow-lg">
                Not sure?
                <br />
                Find what fits you
              </span>
            </span>
            <span className="finder-fab__btn relative flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16">
              <span className="finder-fab__ring" aria-hidden />
              <span className="relative z-[1] font-display text-3xl font-black italic leading-none text-[#1a0c10] sm:text-4xl">
                !
              </span>
            </span>
          </button>
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
                <div className="shrink-0 border-b border-black/10 bg-gradient-to-r from-[#1a0a0e] via-[#2a1218] to-[#1a0a0e] px-5 py-4 text-white sm:px-6 sm:py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold)]">
                        Category Finder
                      </p>
                      <h2
                        id="finder-title"
                        className="mt-1 font-display text-xl font-black italic uppercase tracking-tight sm:text-2xl"
                      >
                        Choose What Fits You
                      </h2>
                      <p className="mt-1.5 text-sm text-white/70">
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

                <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
                  <div className="max-h-[42vh] space-y-4 overflow-y-auto overscroll-contain border-b border-black/10 p-5 sm:p-6 lg:max-h-none lg:border-b-0 lg:border-r">
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

                  <div className="flex max-h-[38vh] flex-col bg-[#f7f4f2] lg:max-h-none">
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                        Recommendations
                      </p>
                      <h3 className="mt-1 font-display text-lg font-black italic uppercase">
                        Recommended for You
                      </h3>
                      {!recommendations.length ? (
                        <div className="mt-6 border border-dashed border-black/15 bg-white/70 px-4 py-8 text-center">
                          <p className="font-display text-3xl font-black italic text-[var(--brand-gold)]/40">
                            !
                          </p>
                          <p className="mt-2 text-sm text-[#666]">
                            Complete the questions to see which awards fit best.
                          </p>
                        </div>
                      ) : (
                        <ul className="mt-4 space-y-3">
                          {recommendations.map((r, i) => (
                            <li
                              key={r.slug}
                              className="border border-black/10 border-l-4 border-l-[var(--brand-gold)] bg-white p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold-dark)]">
                                  {r.match}
                                </p>
                                <span className="font-display text-sm font-black italic text-black/20">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                              </div>
                              <p className="mt-1 font-display text-sm font-bold uppercase leading-snug">
                                {r.title}
                              </p>
                              <p className="mt-1 text-sm text-[#666]">{r.tagline}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-4 text-xs text-[#888]">
                        MSME of the Year is qualification-based and cannot be selected here.
                      </p>
                    </div>
                    <div className="shrink-0 border-t border-black/10 bg-white p-4 sm:px-6">
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
                    <div>
                      <h2 className="font-display text-base font-black uppercase italic tracking-tight text-white min-[480px]:text-lg sm:text-xl">
                        {c.title}
                      </h2>
                      <p className="mt-1.5 text-[11px] leading-snug text-white/80 min-[480px]:mt-2 min-[480px]:text-xs sm:text-sm sm:leading-relaxed">
                        Qualification-based — not open for direct nomination. Strong performers from
                        other categories may be considered.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggle(c.slug)}
                disabled={locked || atLimit}
                aria-pressed={on}
                className={cn(
                  "category-block group relative overflow-hidden border text-left shadow-[3px_4px_0_rgba(26,12,16,0.1)] transition",
                  shape.span,
                  shape.minH,
                  shape.radius,
                  on
                    ? "z-[2] border-[var(--brand-gold)] shadow-[4px_5px_0_rgba(232,169,20,0.45)] ring-2 ring-[var(--brand-gold)]"
                    : "border-black/20 hover:z-[1] hover:border-[var(--brand-gold)]/70 hover:shadow-[5px_6px_0_rgba(26,12,16,0.16)]",
                  (locked || atLimit) && "cursor-not-allowed",
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
                <div className="relative z-[1] flex h-full flex-col justify-between p-2.5 min-[480px]:p-3.5 sm:p-4">
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
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/80 sm:text-xs">
                      {c.tagline}
                    </p>
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
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
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
            <Link href="/nominate/documents" className="btn-primary">
              Continue to Documents
            </Link>
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
    <div>
      <label className="label">{label}</label>
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
