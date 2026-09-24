import { PageHero } from "@/components/public/PageHero";
import { Band } from "@/components/public/Section";
import { site } from "@/content/site";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Governance"
        title="Privacy Policy"
        description={`How ${site.name} handles personal and business information.`}
      />
      <Band tone="light">
        <div className="space-y-3">
          {[
            ["Information We Collect", "Identity and contact details, organisation information, application content, uploaded evidence, enquiry forms, and technical logs required for security and service delivery."],
            ["How We Use Information", "To administer nominations, verify eligibility, support jury evaluation, communicate status updates, operate the event, and meet legal or audit obligations."],
            ["Confidential Business Data", "Non-public financial and commercial information submitted for evaluation is restricted to authorised secretariat, verification and jury roles. It is not ordinarily published."],
            ["Finalist Publicity", "Approved public-profile fields (such as business name, logo and short description) may be published for finalists with applicable consent."],
            ["Sharing", "Data may be shared with independent jurors, verification partners and service providers under confidentiality and role-based access controls. Commercial sponsorship data is separated from jury workflows."],
            ["Retention", "Application and evaluation records are retained for governance, audit and dispute reconstruction as required by the awards process."],
            ["Your Choices", "Applicants may request access or correction of personal contact details through the Awards Secretariat, subject to verification requirements and process integrity constraints."],
            ["Contact", "Privacy enquiries may be submitted via the Contact page once official secretariat channels are published."],
          ].map(([t, b]) => (
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
