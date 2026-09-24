"use client";

import Link from "next/link";
import { PageHero } from "@/components/public/PageHero";
import { Band, BandHeader, Tile } from "@/components/public/Section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const jury = [
  ["Jury Chair", "Senior industrialist / respected business leader", "Leadership & overall credibility"],
  ["Finance Expert", "Chartered Accountant / finance professional", "Financial performance & growth"],
  ["Manufacturing & Operations Leader", "Industry operations expertise", "Manufacturing & operational excellence"],
  ["Technology & Innovation Leader", "Technology / digital expertise", "Innovation & digital transformation"],
  ["Banking / Financial Institution Leader", "Banking & credit perspective", "Business sustainability & governance"],
  ["Academic / Entrepreneurship Expert", "Academia & entrepreneurship", "Innovation, scalability & research"],
  ["People / ESG / Governance Leader", "People, ESG and governance", "Employer excellence & social impact"],
];

export default function JuryPage() {
  return (
    <>
      <PageHero
        eyebrow="Jury"
        title="Independent Expertise. Credible Recognition."
        description="Applications are evaluated through an independent jury framework designed around expertise, fairness, evidence and integrity."
        primaryHref="/jury-portal/login"
        primaryLabel="Evaluate Applications"
      />

      {/* LIGHT */}
      <Band tone="light">
        <BandHeader eyebrow="Recommended Grand Jury" title="Composition" />
        <Stagger className="mt-10 grid gap-3 md:grid-cols-2">
          {jury.map(([role, who, perspective], i) => (
            <StaggerItem key={role}>
              <Tile tone="light" className="relative overflow-hidden">
                <span className="num-mark absolute -right-1 -bottom-2" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="relative z-[1] font-display text-base font-black uppercase tracking-tight">
                  {role}
                </h3>
                <p className="prose-muted relative z-[1] mt-2 !max-w-none">{who}</p>
                <p className="relative z-[1] mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
                  Perspective: {perspective}
                </p>
              </Tile>
            </StaggerItem>
          ))}
        </Stagger>
      </Band>

      {/* DARK */}
      <Band tone="dark">
        <div className="split-rail">
          <Reveal>
            <p className="section-eyebrow">Process</p>
            <h2 className="section-title mt-3">How Evaluation Works</h2>
            <ol className="mt-6 space-y-3">
              {[
                "Minimum 3 Independent Evaluators",
                "Independent Scoring",
                "Evidence Review",
                "Conflict Checks",
                "Score Moderation Where Required",
                "Finalist Assessment",
                "Results Lock",
              ].map((s, i) => (
                <li key={s} className="flex gap-3 border-b border-white/10 py-2.5 text-sm text-white/75">
                  <span className="font-display text-sm font-black italic text-[var(--brand-gold)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="prose-muted mt-5">
              MSME of the Year is separately evaluated through the Grand Jury framework.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <Tile tone="dark" className="p-6 sm:p-8">
              <h2 className="font-display text-2xl font-black italic uppercase text-white">
                Jury Independence
              </h2>
              <ul className="mt-5 space-y-2">
                {[
                  "Confidentiality",
                  "Conflict-of-Interest Declaration",
                  "Independent Evaluation",
                  "Evidence-Based Scoring",
                  "No Commercial Influence",
                ].map((item) => (
                  <li key={item} className="border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/about#integrity"
                className="mt-6 inline-flex text-sm font-bold uppercase tracking-[0.1em] text-[var(--brand-gold)] underline-offset-4 hover:underline"
              >
                View Integrity Framework →
              </Link>
            </Tile>
          </Reveal>
        </div>
      </Band>

      <Band tone="light" className="text-center">
        <BandHeader
          eyebrow="Jury Access"
          title="Ready to Evaluate Applications?"
          description="Sign in to the Jury Portal to review assigned applications, declare conflicts, and submit independent scores."
        />
        <Link href="/jury-portal/login" className="btn-gold mt-8">
          Evaluate Applications
        </Link>
      </Band>
    </>
  );
}
