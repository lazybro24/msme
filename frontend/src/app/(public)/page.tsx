"use client";

import Link from "next/link";
import { awardCategories } from "@/content/awards";
import { site } from "@/content/site";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { CategoryCard } from "@/components/awards/CategoryCard";
import { Band, BandHeader, Tile } from "@/components/public/Section";
import { GoldHeroTitle } from "@/components/public/GoldHeroTitle";

const pillars = [
  { n: "01", title: "Recognize", body: "Celebrate credible business excellence." },
  { n: "02", title: "Showcase", body: "Give deserving Mysuru businesses greater visibility." },
  { n: "03", title: "Connect", body: "Bring businesses and opportunities together." },
  { n: "04", title: "Enable", body: "Create access to knowledge and growth ecosystems." },
  { n: "05", title: "Celebrate", body: "Recognise entrepreneurial achievement." },
];

const integrityItems = [
  "₹0 Nomination Fee",
  "No Paid Awards",
  "No Public Voting",
  "No Sponsor Influence",
  "Independent Jury",
  "Evidence-Based Evaluation",
  "Conflict-of-Interest Controls",
  "Verification & Audit Trail",
];

const journey = [
  "Choose Category",
  "Complete Application",
  "Submit Evidence",
  "Eligibility & Verification",
  "Independent Jury Evaluation",
  "Top 5 Finalists",
  "Finalist Assessment",
  "Awards Recognition",
];

const recognitions = [
  { icon: "🏆", label: "Winner" },
  { icon: "🥈", label: "1st Runner-Up" },
  { icon: "🥉", label: "2nd Runner-Up" },
  { icon: "⭐", label: "Official Finalist" },
  { icon: "⭐", label: "Official Finalist" },
];

const eventOutcomes = [
  { title: "LEARN", body: "MSME Growth Summit" },
  { title: "CONNECT", body: "Business Connect" },
  { title: "GROW", body: "Finance · Buyers · Partners · Opportunities" },
  { title: "CELEBRATE", body: "Mysuru MSME Awards 2026" },
];

export default function HomePage() {
  return (
    <div className="home-page">
      {/* DARK — Hero */}
      <section className="hero-stage">
        <div className="w-full max-w-5xl px-1">
          <p className="anim-rise mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--brand-gold)] sm:text-[11px]">
            Mysuru MSME Awards 2026
          </p>
          <GoldHeroTitle className="anim-rise-delay" />
          <p className="anim-rise-delay-2 mx-auto mt-4 max-w-2xl text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-gold)] sm:text-base">
            Mysuru&apos;s Business Recognition &amp; Growth Platform
          </p>
          <p className="anim-rise-delay-2 type-lead mx-auto mt-4 !text-white">
            Celebrating the enterprises, entrepreneurs and people contributing to Mysuru&apos;s
            economic progress while creating meaningful opportunities for recognition, visibility,
            connections, knowledge and growth.
          </p>
          <div className="anim-rise-delay-2 mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/nominate" className="btn-gold">
              Nominate Now
            </Link>
            <Link href="/awards" className="btn-outline-light">
              Explore Awards
            </Link>
          </div>
          <div className="chip-row anim-rise-delay-2 mt-9">
            <span className="chip">
              <CountUp value={10} /> Categories
            </span>
            <span className="chip">
              <CountUp value={50} /> Finalists
            </span>
            <span className="chip">
              <CountUp value={0} prefix="₹" /> Fee
            </span>
            <span className="chip">Independent Jury</span>
            <span className="chip">Evidence-Based</span>
          </div>
        </div>
      </section>

      {/* LIGHT — Nominations open */}
      <Band tone="light" className="!py-12 text-center">
        <Reveal>
          <h2 className="font-display text-xl font-black italic uppercase text-[var(--ink)] sm:text-3xl">
            Nominations Are Officially Open for 2026
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--muted)]">
            ₹0 nomination fee · Independent jury · Evidence-based evaluation
          </p>
          <Link href="/nominate" className="btn-gold mt-6">
            Nominate Now
          </Link>
        </Reveal>
      </Band>

      {/* Transparent pillars — stage shows through, solid white cards */}
      <Band tone="light-alt" className="band-no-pattern">
        <BandHeader
          eyebrow="Why This Platform Exists"
          title="More Than an Award. A Platform for Growth."
          description="Great businesses are being built across Mysuru every day. This platform identifies, recognises and showcases them while connecting the MSME ecosystem with growth opportunities."
        />
        <Stagger className="mt-5 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-3 md:mt-10 lg:grid-cols-5">
          {pillars.map((p) => (
            <StaggerItem key={p.title}>
              <article className="pillar-card pillar-card--compact max-md:min-h-0 max-md:!p-3.5">
                <span className="num-mark absolute right-2 bottom-0 max-md:text-4xl" aria-hidden>
                  {p.n}
                </span>
                <div>
                  <div className="mb-4 h-0.5 w-10 bg-[var(--brand-gold)] max-md:mb-2.5 max-md:w-8" />
                  <h3 className="font-display text-base font-black uppercase tracking-[0.06em] max-md:text-sm">
                    {p.title}
                  </h3>
                  <p className="pillar-body mt-2 text-sm leading-relaxed max-md:mt-1.5 max-md:text-xs max-md:leading-snug">
                    {p.body}
                  </p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
        <div className="mt-10 text-center">
          <Link href="/about" className="btn-gold">
            About the Platform →
          </Link>
        </div>
      </Band>

      {/* LIGHT — Categories */}
      <Band tone="light">
        <BandHeader
          eyebrow="Awards 2026"
          title="Official Award Categories"
          description="10 awards celebrating business excellence across Mysuru’s MSME ecosystem."
        />
        <div className="mt-10 space-y-4">
          <CategoryCard
            category={awardCategories.find((c) => !c.directApply) ?? awardCategories[0]}
            variant="featured"
          />
          <Stagger className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {awardCategories
              .filter((c) => c.directApply)
              .map((c) => (
                <StaggerItem key={c.slug} className="h-full min-h-0">
                  <CategoryCard category={c} variant="standard" />
                </StaggerItem>
              ))}
          </Stagger>
        </div>
        <div className="mt-10 text-center">
          <Link href="/awards" className="btn-gold">
            Explore All Categories →
          </Link>
        </div>
      </Band>

      {/* DARK — Recognition */}
      <Band tone="dark">
        <BandHeader
          eyebrow="Recognition Structure"
          title="10 Categories. 50 Finalist Recognitions."
          description="Each category may recognise, subject to eligibility and evaluation standards."
        />
        <Stagger className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-5">
          {recognitions.map((r, i) => (
            <StaggerItem key={r.label + r.icon + i}>
              <Tile tone="dark" className="text-center">
                <p className="text-2xl" aria-hidden>
                  {r.icon}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em]">{r.label}</p>
              </Tile>
            </StaggerItem>
          ))}
        </Stagger>
      </Band>

      {/* LIGHT — Integrity + Journey */}
      <Band tone="light">
        <div className="split-rail">
          <Reveal>
            <p className="section-eyebrow">Integrity</p>
            <h2 className="section-title mt-3">Recognition That Must Be Earned.</h2>
            <ul className="mt-6 space-y-0">
              {integrityItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 border-b border-black/10 py-3 text-sm text-[#444]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-gold)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/about#integrity" className="btn-gold mt-6">
              View Integrity Charter →
            </Link>
          </Reveal>
          <Reveal delay={0.08}>
            <Tile tone="ink" className="p-6 sm:p-8">
              <p className="section-eyebrow !text-[var(--brand-gold)]">Nomination Journey</p>
              <h2 className="mt-2 font-display text-2xl font-black italic uppercase text-white">
                Simple to Enter. Serious to Win.
              </h2>
              <ol className="mt-6 space-y-3">
                {journey.map((step, i) => (
                  <li key={step} className="step-line relative text-sm text-white/70">
                    <span className="step-dot" aria-hidden />
                    <span className="font-display text-xs font-black italic text-[var(--brand-gold)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>{" "}
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.1em] text-[var(--brand-gold)]">
                Nomination Fee: ₹0
              </p>
            </Tile>
          </Reveal>
        </div>
      </Band>

      {/* DARK — Eligibility */}
      <Band tone="dark" className="text-center">
        <BandHeader
          eyebrow="Eligibility"
          title="Could Your Business Be One of Mysuru's Best?"
          description="Eligible Micro, Small and Medium Enterprises with substantial business operations within Mysuru District may participate, subject to category requirements."
        />
        <Link href="/awards#participate" className="btn-gold mt-8">
          Eligibility Requirements →
        </Link>
      </Band>

      {/* LIGHT — Jury + Event */}
      <Band tone="light">
        <div className="split-rail">
          <Reveal>
            <p className="section-eyebrow">Jury</p>
            <h2 className="section-title mt-3">
              Judged by Experience. Governed by Independence.
            </h2>
            <p className="prose-muted mt-3">
              Applications are evaluated through an independent jury framework representing business
              leadership, finance, manufacturing, technology, banking, academia, entrepreneurship,
              people practices, ESG and governance.
            </p>
            <Link href="/jury" className="btn-gold mt-6">
              Explore the Jury →
            </Link>
          </Reveal>
          <Reveal delay={0.08}>
            <Tile tone="ink" className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold)]">
                Event — One Day. Four Outcomes.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {eventOutcomes.map((e) => (
                  <div key={e.title} className="tile-dark p-4">
                    <p className="font-display text-sm font-black uppercase text-white">{e.title}</p>
                    <p className="mt-1 text-sm text-white/60">{e.body}</p>
                  </div>
                ))}
              </div>
              <Link href="/event" className="btn-gold mt-5">
                Explore the Event →
              </Link>
            </Tile>
          </Reveal>
        </div>
      </Band>

      {/* DARK — Partners */}
      <Band tone="dark" className="text-center">
        <BandHeader
          eyebrow="Partnership"
          title="Build With Mysuru's Business Community"
          description="Partner with a platform bringing together entrepreneurs, businesses, institutions and ecosystem leaders. Sponsorship does not influence award results."
        />
        <Link href="/event#partners" className="btn-gold mt-2">
          Become a Partner →
        </Link>
      </Band>

      {/* LIGHT — Closing */}
      <Band tone="light" className="text-center">
        <div className="band-rule" aria-hidden />
        <h2 className="section-title">
          Your Business Has a Story. Let Mysuru Recognise It.
        </h2>
        <p className="prose-muted mx-auto mt-3">
          Showcase your achievements. Demonstrate your impact. Join the businesses shaping
          Mysuru&apos;s future.
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#888]">{site.organizer}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/nominate" className="btn-gold">
            Nominate Now
          </Link>
          <Link href="/awards" className="btn-secondary">
            Explore Awards
          </Link>
        </div>
      </Band>
    </div>
  );
}
