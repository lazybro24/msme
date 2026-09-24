"use client";

import Link from "next/link";
import { Band, BandHeader, Tile } from "@/components/public/Section";
import { Reveal } from "@/components/motion/Reveal";

const docs = [
  "Udyam Certificate",
  "PAN",
  "GST Certificate where applicable",
  "Registration / Incorporation Proof",
  "Proof of Mysuru Operations",
  "Financial / Performance Evidence",
  "Category-Specific Evidence",
  "Authorized Applicant Declaration",
];

const requirements = [
  "Valid MSME status (Micro, Small or Medium Enterprise)",
  "Valid Udyam Registration",
  "Substantial business operations within Mysuru District",
  "Applicable operating-history for your chosen category",
  "Relevant statutory registrations, licences and approvals",
  "Verifiable supporting evidence for your claims",
  "Category-specific requirements as published for each award",
];

/** Requirements + nominate CTA — shown on the Awards page */
export function EligibilitySections() {
  return (
    <>
      <Band tone="dark" id="participate">
        <div className="split-rail !items-stretch">
          <Reveal>
            <Tile tone="light" className="h-full">
              <h2 className="section-title text-2xl">To Be Eligible</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#555]">
                You should have the following in place before you create an account and nominate:
              </p>
              <ul className="mt-5 space-y-3">
                {requirements.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-[#444]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-gold)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm text-[#333]">
                <strong>Note:</strong> A registered address in Mysuru alone is not enough. You should
                demonstrate meaningful business operations within Mysuru District. Final confirmation
                happens after nomination — the secretariat verifies your application and either
                accepts it for jury evaluation or rejects it with a reason.
              </div>
            </Tile>
          </Reveal>
          <Reveal delay={0.08}>
            <Tile tone="ink" className="h-full p-6">
              <h2 className="font-display text-2xl font-black italic uppercase text-white">
                Documents You Should Have
              </h2>
              <ul className="mt-5 space-y-2">
                {docs.map((d) => (
                  <li key={d} className="border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                    {d}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.08em] text-[var(--brand-gold)]">
                Nomination Fee: ₹0
              </p>
            </Tile>
          </Reveal>
        </div>
      </Band>

      <Band tone="light" id="nominate-cta">
        <BandHeader
          eyebrow="Ready to Nominate"
          title="Create an Account & Nominate"
          description="If you have the requirements above, create an account, submit your nomination, and track verification from your dashboard."
        />
        <Reveal>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/nominate/register" className="btn-gold">
              Create Account & Nominate →
            </Link>
            <Link href="/nominate/login" className="btn-secondary">
              Already registered? Sign in
            </Link>
          </div>
        </Reveal>
      </Band>
    </>
  );
}
