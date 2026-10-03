/**
 * Nomination answer completeness (mirrors frontend/src/lib/nominationCompleteness.ts).
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
  categoryQuestionCount: number,
): string[] {
  const missing: string[] = [];

  for (let i = 0; i < 4; i++) {
    if (!yes(answers, `eligibility_${i}`)) missing.push(`Eligibility confirmation ${i + 1}`);
  }

  const overview: [string, string][] = [
    ["overview_describe", "Business description"],
    ["overview_products", "Products / services"],
    ["overview_customers", "Customers / markets"],
    ["overview_differentiates", "Differentiation"],
    ["overview_achievements", "Achievements"],
  ];
  for (const [k, label] of overview) {
    if (!filled(answers, k)) missing.push(label);
  }

  const metrics = ["Revenue", "Profit / EBITDA", "Employees", "Customers / Clients", "Locations / Markets"];
  for (let mi = 0; mi < metrics.length; mi++) {
    if (!filled(answers, `perf_m${mi}_y2`)) missing.push(`${metrics[mi]} (FY-1)`);
  }

  for (let i = 0; i < Math.max(0, categoryQuestionCount); i++) {
    if (!filled(answers, `category_q_${i}`)) missing.push(`Category question ${i + 1}`);
  }

  const mysuru: [string, string][] = [
    ["mysuru_contribution", "Mysuru contribution"],
    ["mysuru_employees", "Mysuru employees"],
    ["mysuru_vendors", "Local vendors"],
    ["mysuru_sourcing", "Local sourcing"],
    ["mysuru_employment", "Local employment"],
    ["mysuru_community", "Community contribution"],
    ["mysuru_ecosystem", "Mysuru ecosystem"],
  ];
  for (const [k, label] of mysuru) {
    if (!filled(answers, k)) missing.push(label);
  }

  if (!filled(answers, "signature_achievement")) missing.push("Signature achievement");
  if (!filled(answers, "signature_why")) missing.push("Why achievement matters");
  if (!filled(answers, "decl_signatory")) missing.push("Declaration signatory");
  if (!filled(answers, "decl_designation")) missing.push("Declaration designation");
  if (!filled(answers, "decl_place")) missing.push("Declaration place");
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
