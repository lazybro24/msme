"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { apiGet } from "@/lib/api";

export type NominationProgress = {
  profileComplete: boolean;
  hasCategory: boolean;
  docsReady: boolean;
  submitted: boolean;
  reviewHref: string;
  ready: boolean;
  /** Completed steps 0–5 (Account always counts as done when signed in). */
  doneCount: number;
  /** First incomplete step id 1–5, or 5 if all done. */
  currentStepId: number;
  /** Fill % from completed work only — never from current URL. */
  pct: number;
  /** Whether a top-nav / step route is reachable in order. */
  canAccess: (href: string) => boolean;
};

export function useNominationProgress(): NominationProgress {
  const pathname = usePathname();
  const [profileComplete, setProfileComplete] = useState(false);
  const [hasCategory, setHasCategory] = useState(false);
  const [docsReady, setDocsReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewHref, setReviewHref] = useState("/nominate/categories");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<{ complete: boolean }>("/api/profile").catch(() => ({ complete: false })),
      apiGet<{ applications: { applicationId: string; status: string }[] }>("/api/applications").catch(
        () => ({ applications: [] }),
      ),
      apiGet<{ completeCount: number; totalMandatory: number }>("/api/documents").catch(() => ({
        completeCount: 0,
        totalMandatory: 7,
      })),
    ]).then(([profile, appsRes, docs]) => {
      if (cancelled) return;
      const apps = appsRes.applications ?? [];
      const draft = apps.find((a) => a.status === "DRAFT");
      setProfileComplete(Boolean(profile.complete));
      setHasCategory(apps.length > 0);
      setDocsReady(docs.completeCount >= docs.totalMandatory && docs.totalMandatory > 0);
      setSubmitted(apps.some((a) => a.status !== "DRAFT"));
      setReviewHref(
        draft
          ? `/nominate/applications/${draft.applicationId}`
          : apps[0]
            ? `/nominate/applications/${apps[0].applicationId}`
            : "/nominate/categories",
      );
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return useMemo(() => {
    const accountDone = true;
    const stepsDone = [
      accountDone,
      profileComplete,
      hasCategory,
      docsReady,
      submitted,
    ];
    const doneCount = stepsDone.filter(Boolean).length;
    const firstIncompleteIdx = stepsDone.findIndex((d) => !d);
    const currentStepId = firstIncompleteIdx === -1 ? 5 : firstIncompleteIdx + 1;
    const pct = Math.round((doneCount / 5) * 100);

    function canAccess(href: string) {
      // Always allowed: dashboard, messages, help
      if (
        href.startsWith("/nominate/dashboard") ||
        href === "/nominate" ||
        href.startsWith("/nominate/messages") ||
        href.startsWith("/nominate/help")
      ) {
        return true;
      }
      // Details / business profile
      if (href.startsWith("/nominate/profile")) return true;
      // Category requires details
      if (href.startsWith("/nominate/categories")) return profileComplete;
      // Documents requires category saved
      if (href.startsWith("/nominate/documents")) return profileComplete && hasCategory;
      // Review / applications requires documents
      if (href.startsWith("/nominate/applications")) {
        return profileComplete && hasCategory && docsReady;
      }
      // Finalist profile is post-workflow — keep reachable but not part of loader
      if (href.startsWith("/nominate/finalist-profile")) return true;
      return true;
    }

    return {
      profileComplete,
      hasCategory,
      docsReady,
      submitted,
      reviewHref,
      ready,
      doneCount,
      currentStepId,
      pct,
      canAccess,
    };
  }, [profileComplete, hasCategory, docsReady, submitted, reviewHref, ready]);
}
