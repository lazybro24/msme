"use client";

import { ContactFaqSections } from "@/components/public/ContactFaqSections";
import { Reveal } from "@/components/motion/Reveal";

export default function ContactPage() {
  return (
    <div className="contact-page">
      <section className="contact-hero relative z-[1] overflow-hidden">
        <div className="contact-hero__glow" aria-hidden />
        <svg
          className="pointer-events-none absolute -right-10 top-8 h-[90%] w-[48%] opacity-25"
          viewBox="0 0 360 420"
          fill="none"
          aria-hidden
        >
          <rect x="80" y="60" width="200" height="140" rx="8" stroke="#e8a914" strokeWidth="2" />
          <path d="M80 90h200" stroke="#e8a914" strokeWidth="2" opacity="0.6" />
          <circle cx="110" cy="75" r="5" fill="#e8a914" />
          <circle cx="130" cy="75" r="5" fill="#e8a914" opacity="0.6" />
          <path
            d="M120 230c0-40 30-70 70-70s70 30 70 70v40H120v-40z"
            stroke="#e8a914"
            strokeWidth="2"
          />
          <circle cx="190" cy="200" r="28" stroke="#e8a914" strokeWidth="2" />
        </svg>

        <div className="container-page relative py-12 lg:py-16">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand-gold)] sm:text-[11px]">
              Contact
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-black italic uppercase leading-[1.05] tracking-tight text-white sm:text-4xl md:text-5xl">
              Let&apos;s Connect
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Browse FAQs first, or send an enquiry to the Awards Secretariat. We&apos;re here for
              nomination support, partnerships, media and more.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#enquiry" className="btn-gold">
                Submit Enquiry
              </a>
              <a href="#faq" className="btn-outline-light">
                View FAQs
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <ContactFaqSections />
    </div>
  );
}
