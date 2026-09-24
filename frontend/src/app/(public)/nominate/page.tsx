"use client";

import Link from "next/link";
import { Band, BandHeader } from "@/components/public/Section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

const steps = [
  {
    n: "01",
    title: "Create Account",
    body: "Register with your business details. No nomination fee.",
    bg: "from-[#3a1a12] via-[#1a0a0e] to-[#0d0507]",
    accent: "#e8a914",
  },
  {
    n: "02",
    title: "Complete Profile",
    body: "Share your enterprise profile and supporting evidence.",
    bg: "from-[#0f2f3a] via-[#0a1c24] to-[#061015]",
    accent: "#2dd4bf",
  },
  {
    n: "03",
    title: "Choose Categories",
    body: "Select up to two award categories that match your achievements.",
    bg: "from-[#1e3a5f] via-[#0f2438] to-[#081520]",
    accent: "#7ec8ff",
  },
  {
    n: "04",
    title: "Submit & Track",
    body: "Submit your application and follow verification from your dashboard.",
    bg: "from-[#14532d] via-[#052e16] to-[#031a0c]",
    accent: "#86efac",
  },
];

const promises = [
  { label: "₹0 Nomination Fee", tone: "from-[#5a2a14]/80 to-[#1a0c10]/90" },
  { label: "No Paid Awards", tone: "from-[#1e3a5f]/80 to-[#0a1520]/90" },
  { label: "No Public Voting", tone: "from-[#134e4a]/80 to-[#0a1f1c]/90" },
  { label: "Independent Jury", tone: "from-[#7c2d12]/80 to-[#1c0a06]/90" },
  { label: "Evidence-Based Selection", tone: "from-[#1e3a8a]/80 to-[#0b1224]/90" },
  { label: "Conflict-of-Interest Controls", tone: "from-[#3f1d12]/80 to-[#120808]/90" },
];

const prepLinks = [
  {
    href: "/awards#participate",
    label: "Eligibility Requirements",
    hint: "What you should have before you nominate",
    wash: "from-[#fff7e6] to-white",
    bar: "bg-[var(--brand-gold)]",
    glow: "#e8a914",
  },
  {
    href: "/awards",
    label: "Explore Categories",
    hint: "10 awards across Mysuru’s MSME ecosystem",
    wash: "from-[#eef6ff] to-white",
    bar: "bg-[#3a7ca5]",
    glow: "#3a7ca5",
  },
  {
    href: "/award-rules",
    label: "Award Rules",
    hint: "Read regulations before you apply",
    wash: "from-[#f4f0eb] to-white",
    bar: "bg-[#8b4513]",
    glow: "#8b4513",
  },
  {
    href: "/contact#faq",
    label: "FAQ",
    hint: "Answers to common nomination questions",
    wash: "from-[#eefaf6] to-white",
    bar: "bg-[#0f766e]",
    glow: "#0f766e",
  },
];

export default function NominatePage() {
  return (
    <div className="nomination-page">
      {/* HERO */}
      <section className="nomination-hero relative z-[1] overflow-hidden">
        <div className="nomination-hero__glow" aria-hidden />
        <svg
          className="pointer-events-none absolute -right-16 top-0 h-[120%] w-[55%] opacity-30"
          viewBox="0 0 400 480"
          fill="none"
          aria-hidden
        >
          <circle cx="260" cy="120" r="90" stroke="#e8a914" strokeWidth="1.5" opacity="0.5" />
          <circle cx="260" cy="120" r="130" stroke="#e8a914" strokeWidth="1" opacity="0.25" />
          <path
            d="M200 40l22 66h70l-56 42 22 66-58-42-58 42 22-66-56-42h70l22-66z"
            fill="#e8a914"
            opacity="0.35"
          />
          <path d="M40 360h320M80 400h240" stroke="#e8a914" strokeWidth="2" opacity="0.35" />
        </svg>

        <div className="container-page relative grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12 lg:py-16">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand-gold)] sm:text-[11px]">
              Nomination
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-black italic uppercase leading-[1.05] tracking-tight text-white sm:text-4xl md:text-5xl">
              Nominate for Mysuru MSME Awards 2026
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Showcase your achievements. Demonstrate your impact. Earn recognition based on merit
              — with a ₹0 nomination fee.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/nominate/register" className="btn-gold">
                Start New Application
              </Link>
              <Link href="/nominate/login" className="btn-outline-light">
                Login / Resume
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {["₹0 Fee", "Max 2 Categories", "Independent Jury", "Evidence-Based"].map((chip) => (
                <span
                  key={chip}
                  className="border border-[var(--brand-gold)]/35 bg-[var(--brand-gold)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="nomination-panel relative overflow-hidden border border-[var(--brand-gold)]/40 p-5 sm:p-6">
              <div className="nomination-panel__bg" aria-hidden />
              <div className="relative z-[1]">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold)]">
                  What happens next
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Create your applicant account",
                    "Submit nomination with documents",
                    "Secretariat verifies — accept or reject with reason",
                    "Accepted nominations go to independent jury",
                  ].map((item, i) => (
                    <li key={item} className="flex gap-3 text-sm text-white/90">
                      <span className="font-display text-base font-black text-[var(--brand-gold)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-white/15 pt-4 text-xs uppercase tracking-[0.12em] text-white/50">
                  {site.organizer}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <Band tone="light-alt" id="how-it-works">
        <BandHeader
          eyebrow="How It Works"
          title="Simple to Enter. Serious to Win."
          description="A clear path from registration to recognition — designed for busy MSME founders and teams."
        />
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <StaggerItem key={s.n}>
              <div
                className={cn(
                  "group relative h-full min-h-[14rem] overflow-hidden border border-black/10 bg-gradient-to-br p-5 text-white shadow-[0_16px_36px_-24px_rgba(0,0,0,0.55)]",
                  s.bg,
                )}
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl"
                  style={{ background: s.accent }}
                  aria-hidden
                />
                <p className="font-display text-4xl font-black italic" style={{ color: s.accent }}>
                  {s.n}
                </p>
                <h3 className="mt-4 font-display text-base font-black uppercase tracking-[0.06em]">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{s.body}</p>
                <div
                  className="absolute inset-x-0 bottom-0 h-1 opacity-80"
                  style={{ background: s.accent }}
                  aria-hidden
                />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Band>

      {/* INTEGRITY */}
      <Band tone="dark">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <Reveal>
            <p className="section-eyebrow !text-[var(--brand-gold)]">Integrity</p>
            <h2 className="section-title mt-3 !text-white">Recognition That Must Be Earned.</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Sponsorship does not influence award results. Evaluation is independent and
              evidence-based.
            </p>
            <Link href="/about#integrity" className="btn-gold mt-6">
              View Integrity Charter →
            </Link>
          </Reveal>
          <Stagger className="grid gap-3 sm:grid-cols-2">
            {promises.map((item) => (
              <StaggerItem key={item.label}>
                <div
                  className={cn(
                    "relative overflow-hidden border border-white/10 bg-gradient-to-br px-4 py-5 text-center transition hover:border-[var(--brand-gold)]/50",
                    item.tone,
                  )}
                >
                  <p className="relative text-xs font-bold uppercase tracking-[0.1em] text-white">
                    {item.label}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Band>

      {/* PREPARE */}
      <Band tone="light">
        <BandHeader
          eyebrow="Before You Register"
          title="Prepare With Confidence"
          description="Review what you should have in place, categories and rules so your application is complete and credible."
        />
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
          {prepLinks.map((link) => (
            <StaggerItem key={link.href}>
              <Link href={link.href} className="group block h-full">
                <div
                  className={cn(
                    "relative h-full overflow-hidden border border-black/10 bg-gradient-to-br p-5 transition group-hover:border-[var(--brand-gold)] group-hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.35)]",
                    link.wash,
                  )}
                >
                  <div className={cn("absolute inset-y-0 left-0 w-1.5", link.bar)} aria-hidden />
                  <div
                    className="pointer-events-none absolute -right-8 -bottom-10 h-36 w-36 rounded-full opacity-40 blur-2xl"
                    style={{ background: link.glow }}
                    aria-hidden
                  />
                  <div className="relative flex items-start justify-between gap-3 pl-2">
                    <h3 className="font-display text-sm font-black uppercase tracking-[0.06em]">
                      {link.label}
                    </h3>
                    <span
                      className="text-[var(--brand-gold-dark)] transition group-hover:translate-x-1"
                      aria-hidden
                    >
                      →
                    </span>
                  </div>
                  <p className="relative mt-2 pl-2 text-sm text-[#555]">{link.hint}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Band>

      {/* CTA */}
      <section className="nomination-cta relative overflow-hidden">
        <div className="nomination-cta__bg" aria-hidden />
        <div className="container-page relative z-[1] py-14 text-center sm:py-16">
          <div className="band-rule mx-auto mb-6" aria-hidden />
          <h2 className="font-display text-2xl font-black italic uppercase tracking-tight text-white sm:text-3xl">
            Ready to Put Your Business Forward?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            Join Mysuru&apos;s businesses competing for credible, merit-based recognition.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/45">{site.organizer}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/nominate/register" className="btn-gold">
              Start New Application
            </Link>
            <Link href="/nominate/login" className="btn-outline-light">
              Login / Resume
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
