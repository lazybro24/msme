/**
 * Shared nomination completeness checks (applicant form + submit API).
 */

export type AnswersMap = Record<string, string | undefined | null>;

function filled(answers: AnswersMap, key: string) {
  return String(answers[key] ?? "").trim().length > 0;
}

function yes(answers: AnswersMap, key: string) {
  return String(answers[key] ?? "").trim().toLowerCase() === "yes";
}

/** Human-readable missing fields for submit gate. */
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

  const qCount = Math.max(0, categoryQuestionCount);
  for (let i = 0; i < qCount; i++) {
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

/** First incomplete form step (1-based). Review is last. */
export function firstIncompleteStep(
  answers: AnswersMap,
  categoryQuestionCount: number,
): number {
  for (let i = 0; i < 4; i++) {
    if (!yes(answers, `eligibility_${i}`)) return 2;
  }
  if (
    !filled(answers, "overview_describe") ||
    !filled(answers, "overview_products") ||
    !filled(answers, "overview_customers") ||
    !filled(answers, "overview_differentiates") ||
    !filled(answers, "overview_achievements")
  ) {
    return 3;
  }
  for (let mi = 0; mi < 5; mi++) {
    if (!filled(answers, `perf_m${mi}_y2`)) return 4;
  }
  for (let i = 0; i < categoryQuestionCount; i++) {
    if (!filled(answers, `category_q_${i}`)) return 5;
  }
  const mysuruKeys = [
    "mysuru_contribution",
    "mysuru_employees",
    "mysuru_vendors",
    "mysuru_sourcing",
    "mysuru_employment",
    "mysuru_community",
    "mysuru_ecosystem",
  ];
  if (mysuruKeys.some((k) => !filled(answers, k))) return 6;
  if (!filled(answers, "signature_achievement") || !filled(answers, "signature_why")) return 7;
  // Step 8 evidence is covered by org mandatory docs gate
  if (
    !filled(answers, "decl_signatory") ||
    !filled(answers, "decl_designation") ||
    !filled(answers, "decl_place") ||
    !filled(answers, "decl_date") ||
    !yes(answers, "decl_agree")
  ) {
    return 9;
  }
  return 10;
}
