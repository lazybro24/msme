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
  if (!filled(answers, "decl_date")) missing.push("Declaration date");
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
  if (
    !filled(answers, "decl_signatory") ||
    !filled(answers, "decl_date") ||
    !yes(answers, "decl_agree")
  ) {
    return 9;
  }
  return 10;
}
