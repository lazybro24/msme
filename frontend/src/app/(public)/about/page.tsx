"use client";

import Link from "next/link";
import { PageHero } from "@/components/public/PageHero";
import { Band, BandHeader, Tile } from "@/components/public/Section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { site } from "@/content/site";

const charter = [
  ["01", "Awards Cannot Be Purchased", "No business can purchase an award, ranking or finalist position."],
  ["02", "Nominations Are Free", "Participation carries no nomination fee."],
  ["03", "No Public Voting", "Recognition is determined through merit and evidence—not popularity."],
  ["04", "Sponsors Cannot Influence Winners", "Commercial relationships remain separate from award evaluation."],
  ["05", "Independent Evidence-Based Evaluation", "Applications are evaluated against predefined criteria."],
  ["06", "Mandatory Conflict-of-Interest Disclosure", "Jurors must disclose relevant relationships and recuse where necessary."],
  ["07", "Verification & Audit Trail", "Material decisions, evaluations and administrative actions are documented."],
];

const pillars = [
  ["Recognize Excellence", "Celebrate credible business achievement."],
  ["Enable Growth", "Connect MSMEs with knowledge, finance, technology and opportunities."],
  ["Build Connections", "Bring entrepreneurs, buyers, institutions and stakeholders together."],
  ["Inspire Tomorrow", "Showcase businesses that inspire Mysuru’s next entrepreneurs."],
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Building a Platform for Mysuru's Business Excellence"
        description={`${site.name} is a business recognition and growth platform created to identify, recognise and enable enterprises and entrepreneurs contributing to Mysuru's economic progress.`}
      />

      {/* LIGHT */}
      <Band tone="light" id="overview">
        <div className="split-rail">
          <Reveal>
            <p className="section-eyebrow">Why Mysuru MSME Awards?</p>
            <h2 className="section-title mt-3">
              Recognition Should Be the Beginning—Not the End.
            </h2>
            <p className="prose-muted mt-4">
              Recognition should not simply end with a trophy. The platform aims to create
              opportunities for businesses through recognition, visibility, knowledge, business
              connections, finance & growth ecosystem access, and market opportunities.
            </p>
          </Reveal>
          <Stagger className="grid gap-3 sm:grid-cols-2">
            {pillars.map(([t, b]) => (
              <StaggerItem key={t}>
                <Tile tone="light">
                  <h3 className="font-display text-sm font-black uppercase tracking-[0.06em]">{t}</h3>
                  <p className="prose-muted mt-2 !max-w-none">{b}</p>
                </Tile>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Band>

      {/* DARK — Vision */}
      <Band tone="dark">
        <BandHeader
          eyebrow="Our Vision"
          title="Mysuru's most credible platform for MSME recognition, connection and growth."
        />
        <Reveal>
          <Tile tone="dark" className="mx-auto max-w-3xl p-6 sm:p-8">
            <p className="section-eyebrow !text-[var(--brand-gold)]">Powered By</p>
            <h3 className="mt-2 font-display text-xl font-black uppercase tracking-tight text-white">
              {site.organizer}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Toya serves as the organizing entity and Awards Secretariat, responsible for award
              administration, stakeholder coordination, nomination management, verification
              coordination and event execution. Merit-based evaluation remains governed through the
              independent jury framework.
            </p>
            <Link href="/jury" className="mt-6 inline-flex text-sm font-bold uppercase tracking-[0.1em] text-[var(--brand-gold)] underline-offset-4 hover:underline">
              Meet the Jury Framework →
            </Link>
          </Tile>
        </Reveal>
      </Band>

      {/* LIGHT-ALT — Integrity */}
      <Band tone="light" id="integrity">
        <BandHeader
          eyebrow="Integrity Charter"
          title="Credibility Before Celebration."
          description="The credibility of the platform is built into the process—not added after the ceremony."
        />
        <Stagger className="mt-10 grid gap-3 md:grid-cols-2">
          {charter.map(([n, t, b]) => (
            <StaggerItem key={n}>
              <Tile tone="light">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
                  {n}
                </p>
                <h3 className="mt-2 font-display text-lg font-black uppercase tracking-tight">{t}</h3>
                <p className="prose-muted mt-2 !max-w-none">{b}</p>
              </Tile>
            </StaggerItem>
          ))}
        </Stagger>
      </Band>

      {/* DARK — Evaluation */}
      <Band tone="dark">
        <div className="split-rail">
          <Reveal>
            <p className="section-eyebrow">Evaluation Framework</p>
            <h2 className="section-title mt-3">100-Point Evaluation</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Tile tone="dark" className="text-center">
                <p className="font-display text-4xl font-black italic text-[var(--brand-gold)]">70%</p>
                <p className="mt-2 text-sm text-white/70">Application & Documentary Assessment</p>
              </Tile>
              <Tile tone="dark" className="text-center">
                <p className="font-display text-4xl font-black italic text-[var(--brand-gold)]">30%</p>
                <p className="mt-2 text-sm text-white/70">Finalist Assessment & Verification</p>
              </Tile>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="section-eyebrow">Supporting Controls</p>
            <h2 className="section-title mt-3">Process Assurance</h2>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                "Evidence Assessment",
                "Minimum Quality Thresholds",
                "Score Variance Monitoring",
                "Jury Moderation",
                "Conflict Management",
                "Result Locking",
                "Process Oversight",
              ].map((item) => (
                <div key={item} className="tile-dark px-3 py-2.5 text-sm text-white/80">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/award-rules" className="text-sm font-bold uppercase tracking-[0.1em] text-white/80 underline-offset-4 hover:text-white hover:underline">
                View Award Rules →
              </Link>
              <Link href="/jury" className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--brand-gold)] underline-offset-4 hover:underline">
                Jury Framework →
              </Link>
            </div>
          </Reveal>
        </div>
      </Band>
    </>
  );
}
