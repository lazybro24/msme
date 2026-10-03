/**
 * Shared nomination completeness checks (applicant form + submit API).
 * Only truly important fields are required — others are optional.
 */

export type AnswersMap = Record<string, string | undefined | null>;

function filled(answers: AnswersMap, key: string) {
  return String(answers[key] ?? "").trim().length > 0;
}

function yes(answers: AnswersMap, key: string) {
  return String(answers[key] ?? "").trim().toLowerCase() === "yes";
}

function eligibilityAnswered(answers: AnswersMap, i: number) {
  const v = String(answers[`eligibility_${i}`] ?? "").trim().toLowerCase();
  if (v === "yes") return true;
  if (v === "no") return filled(answers, `eligibility_${i}_reason`);
  return false;
}

/** Human-readable missing fields for submit gate (important fields only). */
export function missingNominationFields(
  answers: AnswersMap,
  _categoryQuestionCount: number,
): string[] {
  const missing: string[] = [];

  for (let i = 0; i < 4; i++) {
    const v = String(answers[`eligibility_${i}`] ?? "").trim().toLowerCase();
    if (v !== "yes" && v !== "no") {
      missing.push(`Eligibility confirmation ${i + 1}`);
    } else if (v === "no" && !filled(answers, `eligibility_${i}_reason`)) {
      missing.push(`Eligibility reason ${i + 1}`);
    }
  }

  if (!filled(answers, "overview_describe")) missing.push("Business description");
  if (!filled(answers, "perf_m0_y2")) missing.push("Revenue (FY-1)");
  if (!filled(answers, "category_q_0")) missing.push("First category question");
  if (!filled(answers, "mysuru_contribution")) missing.push("Mysuru contribution");
  if (!filled(answers, "signature_achievement")) missing.push("Signature achievement");
  if (!filled(answers, "decl_signatory")) missing.push("Declaration signatory");
  if (!yes(answers, "decl_agree")) missing.push("Declaration agreement");

  return missing;
}

/** First incomplete form step (1-based). Review is last. */
export function firstIncompleteStep(
  answers: AnswersMap,
  _categoryQuestionCount: number,
): number {
  for (let i = 0; i < 4; i++) {
    if (!eligibilityAnswered(answers, i)) return 2;
  }
  if (!filled(answers, "overview_describe")) return 3;
  if (!filled(answers, "perf_m0_y2")) return 4;
  if (!filled(answers, "category_q_0")) return 5;
  if (!filled(answers, "mysuru_contribution")) return 6;
  if (!filled(answers, "signature_achievement")) return 7;
  if (!filled(answers, "decl_signatory") || !yes(answers, "decl_agree")) {
    return 9;
  }
  return 10;
}

/** True when shared (non-scorecard) nomination answers are in place. */
export function sharedAnswersReady(answers: AnswersMap): boolean {
  return (
    filled(answers, "overview_describe") || filled(answers, "decl_signatory")
  );
}

/** All required shared (non-scorecard) fields complete — safe to skip those steps. */
export function sharedNominationComplete(answers: AnswersMap): boolean {
  for (let i = 0; i < 4; i++) {
    if (!eligibilityAnswered(answers, i)) return false;
  }
  if (!filled(answers, "overview_describe")) return false;
  if (!filled(answers, "perf_m0_y2")) return false;
  if (!filled(answers, "mysuru_contribution")) return false;
  if (!filled(answers, "signature_achievement")) return false;
  if (!filled(answers, "decl_signatory") || !yes(answers, "decl_agree")) return false;
  return true;
}

/**
 * Steps still needed for this category.
 * When shared answers are already filled (another category), only scorecard + review remain.
 * Incomplete shared steps (e.g. Revenue FY-1) stay in the path until filled.
 */
export function activeNominationSteps(
  answers: AnswersMap,
  multiCategory: boolean,
): number[] {
  if (multiCategory && sharedNominationComplete(answers)) {
    return [5, 10];
  }
  if (multiCategory && sharedAnswersReady(answers)) {
    const steps: number[] = [];
    for (let i = 0; i < 4; i++) {
      if (!eligibilityAnswered(answers, i)) {
        steps.push(2);
        break;
      }
    }
    if (!filled(answers, "overview_describe")) steps.push(3);
    if (!filled(answers, "perf_m0_y2")) steps.push(4);
    steps.push(5);
    if (!filled(answers, "mysuru_contribution")) steps.push(6);
    if (!filled(answers, "signature_achievement")) steps.push(7);
    steps.push(8);
    if (!filled(answers, "decl_signatory") || !yes(answers, "decl_agree")) steps.push(9);
    steps.push(10);
    return steps;
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}

/** Map a missing-field label from missingNominationFields → form step. */
export function stepForMissingField(label: string): number {
  const l = label.toLowerCase();
  if (l.startsWith("eligibility")) return 2;
  if (l.includes("business description")) return 3;
  if (l.includes("revenue") || l.includes("fy-1")) return 4;
  if (l.includes("category question")) return 5;
  if (l.includes("mysuru")) return 6;
  if (l.includes("signature")) return 7;
  if (l.includes("declaration")) return 9;
  return 10;
}

/** Human step title for the redirect button. */
export function stepLabelForMissingField(label: string): string {
  const step = stepForMissingField(label);
  const labels: Record<number, string> = {
    2: "Eligibility",
    3: "Business Overview",
    4: "Business Performance",
    5: "Category Questions",
    6: "Mysuru Contribution",
    7: "Signature Achievement",
    9: "Declaration",
    10: "Review & Submit",
  };
  return labels[step] ?? "Nomination form";
}

/** Next step in the active path (skips already-answered shared sections). */
export function nextActiveStep(
  current: number,
  answers: AnswersMap,
  multiCategory: boolean,
): number {
  const path = activeNominationSteps(answers, multiCategory);
  const idx = path.indexOf(current);
  if (idx === -1) return path[0] ?? 10;
  return path[Math.min(path.length - 1, idx + 1)];
}

/** Previous step in the active path. */
export function prevActiveStep(
  current: number,
  answers: AnswersMap,
  multiCategory: boolean,
): number {
  const path = activeNominationSteps(answers, multiCategory);
  const idx = path.indexOf(current);
  if (idx <= 0) return path[0] ?? 1;
  return path[idx - 1];
}

/**
 * First incomplete step, skipping shared sections already filled from another category.
 */
export function firstIncompleteActiveStep(
  answers: AnswersMap,
  categoryQuestionCount: number,
  multiCategory: boolean,
): number {
  const path = activeNominationSteps(answers, multiCategory);
  const absolute = firstIncompleteStep(answers, categoryQuestionCount);
  // Prefer the first path step that is still incomplete
  for (const s of path) {
    if (s === 2) {
      for (let i = 0; i < 4; i++) {
        if (!eligibilityAnswered(answers, i)) return 2;
      }
    }
    if (s === 3 && !filled(answers, "overview_describe")) return 3;
    if (s === 4 && !filled(answers, "perf_m0_y2")) return 4;
    if (s === 5 && !filled(answers, "category_q_0")) return 5;
    if (s === 6 && !filled(answers, "mysuru_contribution")) return 6;
    if (s === 7 && !filled(answers, "signature_achievement")) return 7;
    if (s === 9 && (!filled(answers, "decl_signatory") || !yes(answers, "decl_agree"))) {
      return 9;
    }
    if (s === 10) return 10;
    if (s < 5 && absolute <= s) return s;
  }
  return path[path.length - 1] ?? absolute;
}

/** Copy scorecard answers from another category when criterion names match. */
export function reuseMatchingCategoryAnswers(
  targetCriteria: { name: string }[],
  targetAnswers: AnswersMap,
  sourceCriteria: { name: string }[],
  sourceAnswers: AnswersMap,
): AnswersMap {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const sourceByName = new Map<string, string>();
  sourceCriteria.forEach((c, i) => {
    const val = String(sourceAnswers[`category_q_${i}`] ?? "").trim();
    if (val) sourceByName.set(normalize(c.name), val);
  });

  const next = { ...targetAnswers };
  targetCriteria.forEach((c, i) => {
    const key = `category_q_${i}`;
    if (filled(next, key)) return;
    const reused = sourceByName.get(normalize(c.name));
    if (reused) next[key] = reused;
  });
  return next;
}

/**
 * Nomination progress 0–100.
 * Common/shared answers weigh ~45%; category scorecard ~25%; trailing steps ~30%.
 * After common questions are done, the bar mainly reflects remaining scorecard + wrap-up work.
 */
export function computeNominationProgress(
  answers: AnswersMap,
  step: number,
  categoryQuestionCount: number,
): number {
  // Common / shared — up to 45
  let common = 0;
  const eligDone = [0, 1, 2, 3].filter((i) => eligibilityAnswered(answers, i)).length;
  common += (eligDone / 4) * 12;
  if (filled(answers, "overview_describe")) common += 16;
  if (filled(answers, "perf_m0_y2")) common += 17;
  common = Math.min(45, common);

  // Category scorecard — up to 25
  const n = Math.max(1, categoryQuestionCount);
  let catDone = 0;
  for (let i = 0; i < n; i++) {
    if (filled(answers, `category_q_${i}`)) catDone += 1;
  }
  const scorecard = (catDone / n) * 25;

  // Trailing shared wrap-up — up to 30
  let trailing = 0;
  if (filled(answers, "mysuru_contribution")) trailing += 8;
  if (filled(answers, "signature_achievement")) trailing += 8;
  if (filled(answers, "decl_signatory") && yes(answers, "decl_agree")) trailing += 10;
  if (step >= 8) trailing += 2;
  if (step >= 10) trailing += 2;
  trailing = Math.min(30, trailing);

  return Math.min(100, Math.round(common + scorecard + trailing));
}

/** Progress of work left after common questions (0–100 of the remaining slice). */
export function remainingAfterCommonProgress(
  answers: AnswersMap,
  step: number,
  categoryQuestionCount: number,
): number {
  const overall = computeNominationProgress(answers, step, categoryQuestionCount);
  if (overall <= 45) return 0;
  return Math.min(100, Math.round(((overall - 45) / 55) * 100));
}
