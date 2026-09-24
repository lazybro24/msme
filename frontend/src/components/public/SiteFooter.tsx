"use client";

import Link from "next/link";
import { useState } from "react";
import {
  footerExplore,
  footerGovernance,
  footerParticipate,
  site,
} from "@/content/site";
import { TOYA_LOGO_SRC } from "@/lib/logo";

export function SiteFooter() {
  return (
    <footer className="relative z-[1] border-t border-[var(--brand-gold)]/30 bg-black text-white">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        <FooterCol title="Explore" links={footerExplore} />
        <FooterCol title="Participate" links={footerParticipate} />
        <FooterCol title="Governance" links={footerGovernance} />
      </div>

      <div className="bg-white text-black">
        <div className="container-page flex flex-col gap-5 py-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="text-xs leading-relaxed text-black/55">
            © {site.year} Mysuru MSME Awards. All Rights Reserved.
          </p>

          <div className="flex items-center gap-4 sm:gap-5">
            <ToyaLogo />
            <div className="flex min-w-0 flex-col justify-center gap-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-gold)]">
                Powered by
              </p>
              <p className="whitespace-nowrap text-[15px] font-semibold leading-snug tracking-tight text-[#1a1a2e] sm:text-base">
                Toya Corporate Consulting Services
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ToyaLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center border border-[var(--brand-gold)]/50 bg-black/[0.04] font-display text-xl font-black text-[var(--brand-gold)] sm:h-16 sm:w-16"
        aria-hidden
      >
        T
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={TOYA_LOGO_SRC}
      alt="Toya Corporate Consulting Services"
      className="h-14 w-auto max-w-[10rem] shrink-0 object-contain object-left sm:h-16 sm:max-w-[11.5rem]"
      onError={() => setFailed(true)}
    />
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{title}</h3>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white hover:text-[var(--brand-gold)]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
