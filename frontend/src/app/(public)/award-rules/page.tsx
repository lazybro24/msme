import { PageHero } from "@/components/public/PageHero";
import { Band } from "@/components/public/Section";

export const metadata = { title: "Award Rules & Regulations" };

const rules = [
  ["1. Purpose", "The awards recognise eligible MSMEs and entrepreneurs demonstrating excellence, growth, innovation, responsible business practices, leadership and economic or social contribution."],
  ["2. Organizer", "Mysuru MSME Awards 2026 is powered and administered by Toya Corporate Consulting Services Pvt. Ltd., acting as the Awards Secretariat."],
  ["3. Eligibility", "Applicants must satisfy the published common and category-specific eligibility requirements. Eligibility may be verified at any stage."],
  ["4. Geographic Eligibility", "Applicants must demonstrate substantial business operations within Mysuru District. A postal address alone does not automatically establish eligibility."],
  ["5. MSME Status", "Applicants must possess valid Udyam/MSME status in accordance with applicable requirements at the relevant eligibility date."],
  ["6. Official Award Categories", "The competition comprises the ten published award categories."],
  ["7. Maximum Applications", "An enterprise may ordinarily apply for a maximum of two directly applicable categories. MSME of the Year cannot be directly entered."],
  ["8. Nomination Fee", "₹0. No nomination or application fee is payable."],
  ["9. Commercial Independence", "Purchasing sponsorship, advertising, exhibition space, delegate passes, hospitality or another commercial product does not increase scores, guarantee finalist status or influence award outcomes."],
  ["10. Application Accuracy", "Applicants are responsible for ensuring all submitted information is accurate, complete and capable of verification."],
  ["11. Supporting Evidence", "The strength, relevance and credibility of supporting evidence may be considered during evaluation. Unsupported claims may receive reduced or no scoring consideration."],
  ["12. Verification", "Verification may include document review, clarification requests, independent checks, finalist interviews, reference validation and appropriate site verification."],
  ["13. Evaluation", "Intended structure: 70% Application & Documentary Assessment + 30% Finalist Assessment & Verification. Final criteria and weightings should be published before applications close."],
  ["14. Jury Independence", "Jurors evaluate assigned applications independently under the published framework."],
  ["15. Conflict of Interest", "Jurors must disclose actual or potential conflicts. Material conflicts require recusal and reassignment."],
  ["16. Finalist Selection", "Up to five applicants may be selected per category subject to eligibility, scores, evidence, verification and minimum standards."],
  ["17. Recognition Structure", "Where sufficient qualifying applications exist: Winner, 1st Runner-Up, 2nd Runner-Up, Official Finalist, Official Finalist."],
  ["18. MSME of the Year", "The highest honour is qualification-based. Direct applications are not accepted."],
  ["19. Confidentiality", "Reasonable measures will be taken to protect non-public financial, commercial and operational information submitted during evaluation."],
  ["20. Finalist Publicity", "Finalists and award recipients may participate in reasonable award-related publicity subject to applicable consent and privacy terms."],
  ["21. Disqualification", "Grounds may include materially false information, fabricated evidence, eligibility failure, attempted jury influence, improper inducement or serious breach of the rules."],
  ["22. Attempted Influence", "Applicants, sponsors and representatives must not attempt to privately influence jurors regarding scoring or results."],
  ["23. Jury Decisions", "Awards are determined under the approved evaluation and governance framework. Individual evaluator scores and jury deliberations remain confidential."],
  ["24. Result Lock", "Results are formally locked after completion of required scoring, verification, conflict review and process checks."],
  ["25. Withdrawal", "Applicants may withdraw before the published withdrawal deadline."],
  ["26. Operational Changes", "Reasonable operational changes may be made where necessary. Material changes affecting eligibility or evaluation should be communicated transparently."],
  ["27. Event Postponement / Cancellation", "The organizer may reschedule, postpone or cancel the event where circumstances reasonably require."],
  ["28. Data Protection", "Applicant information will be processed according to the published Privacy Policy and applicable legal requirements."],
  ["29. Acceptance", "Submission of an application constitutes acceptance of the Award Rules & Regulations, Privacy Policy, Integrity Charter and applicant declarations."],
];

export default function AwardRulesPage() {
  return (
    <>
      <PageHero eyebrow="Governance" title="Award Rules & Regulations" />
      <Band tone="light">
        <div className="space-y-3">
          {rules.map(([t, b]) => (
            <article key={t} className="border border-black/10 bg-white/90 p-5 backdrop-blur-[1px]">
              <h2 className="font-display text-base font-black uppercase tracking-tight">{t}</h2>
              <p className="prose-muted mt-2">{b}</p>
            </article>
          ))}
        </div>
      </Band>
    </>
  );
}
