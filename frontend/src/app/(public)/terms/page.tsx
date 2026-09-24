import { PageHero } from "@/components/public/PageHero";
import { Band } from "@/components/public/Section";
import { site } from "@/content/site";

export const metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Governance" title="Terms & Conditions" />
      <Band tone="light">
        <div className="space-y-3">
          {[
            ["Acceptance", `By using the ${site.name} website and portals, you agree to these Terms, the Award Rules & Regulations, Integrity Charter and Privacy Policy.`],
            ["Use of the Platform", "You may use the public website and, where authorised, applicant or operations portals only for lawful awards-related purposes."],
            ["Accounts", "Applicants are responsible for safeguarding login credentials and for all activity under their account. Shared jury accounts are prohibited."],
            ["Content Accuracy", "You are responsible for the accuracy and authenticity of information and evidence you submit."],
            ["Intellectual Property", "Site content, brand assets and process materials remain the property of the organizer or respective rights holders."],
            ["No Guarantee of Recognition", "Submission does not guarantee finalist status, podium recognition or any award outcome."],
            ["Limitation", "To the extent permitted by law, the organizer is not liable for indirect or consequential losses arising from use of the platform or event changes."],
            ["Changes", "These Terms may be updated. Material changes affecting applicants will be communicated through the platform where practical."],
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
