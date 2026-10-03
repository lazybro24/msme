/**
 * Nomination answer completeness (mirrors frontend — important fields only).
 */

type AnswersMap = Record<string, unknown>;

function filled(answers: AnswersMap, key: string) {
  return String(answers[key] ?? "").trim().length > 0;
}

function yes(answers: AnswersMap, key: string) {
  return String(answers[key] ?? "").trim().toLowerCase() === "yes";
}

export function missingNominationFields(
  answers: AnswersMap,
  _categoryQuestionCount: number,
): string[] {
  const missing: string[] = [];

  for (let i = 0; i < 4; i++) {
    if (!yes(answers, `eligibility_${i}`)) missing.push(`Eligibility confirmation ${i + 1}`);
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

const CATEGORY_QUESTION_COUNTS: Record<string, number> = {
  MOTY: 8,
  MFG: 8,
  SRV: 7,
  EMG: 7,
  INN: 6,
  GRW: 6,
  WEN: 6,
  YEN: 6,
  SSI: 6,
  EMP: 6,
};

export function categoryQuestionCount(code: string) {
  return CATEGORY_QUESTION_COUNTS[code] ?? 6;
}
