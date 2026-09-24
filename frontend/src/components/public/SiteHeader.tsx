"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { mainNav, site } from "@/content/site";
import { LOGO_SRC } from "@/lib/logo";
import { cn } from "@/lib/utils";

function BrandLogo({ ready }: { ready: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--brand-gold)]/60 bg-gradient-to-br from-[var(--brand-gold-light)] to-[var(--brand-gold-dark)] font-display text-lg font-black italic text-[#1a0c10] sm:h-11 sm:w-11"
        aria-hidden
      >
        M
      </span>
    );
  }

  if (!ready) {
    return <span className="block h-10 w-10 shrink-0 sm:h-11 sm:w-11" aria-hidden />;
  }

  return (
    <motion.img
      layoutId="msme-brand-logo"
      src={LOGO_SRC}
      alt=""
      className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11"
      onError={() => setFailed(true)}
      transition={{ type: "spring", stiffness: 140, damping: 24 }}
    />
  );
}

export function SiteHeader({ logoInNav = true }: { logoInNav?: boolean }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-[100] w-full border-b border-white/10 bg-black text-white">
      <div className="mx-auto grid h-16 w-full max-w-[90rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 sm:h-[4.5rem] sm:gap-6 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8 lg:px-8">
        {/* LEFT — brand with breathing room */}
        <div className="flex min-w-0 items-center justify-self-stretch overflow-hidden">
          <Link
            href="/logo"
            className="flex min-w-0 max-w-full cursor-pointer items-center gap-2 no-underline sm:gap-3.5"
            aria-label="View logo"
          >
            <BrandLogo ready={logoInNav} />
            <span className="min-w-0 truncate font-display text-[9px] font-extrabold uppercase leading-tight tracking-[0.06em] text-white min-[380px]:text-[10px] sm:text-xs sm:tracking-[0.1em] md:text-[13px]">
              Mysuru MSME Awards 2026
            </span>
          </Link>
        </div>

        {/* CENTER — spaced nav links */}
        <nav
          className="hidden items-center justify-center gap-1 justify-self-center lg:flex xl:gap-2"
          aria-label="Primary"
        >
          {mainNav.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative shrink-0 px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors xl:px-3 xl:text-[11px]",
                  active ? "text-[var(--brand-gold)]" : "text-white/75 hover:text-white",
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2.5 -bottom-0.5 h-0.5 bg-[var(--brand-gold)]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT — Nominate with space from edge */}
        <div className="flex shrink-0 items-center justify-end gap-3 justify-self-end">
          <Link href="/nominate" className="header-cta-nominate">
            <span className="lg:hidden">Nominate</span>
            <span className="hidden lg:inline">Nominate Now</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center border border-white/25 hover:border-[var(--brand-gold)]/50 hover:text-[var(--brand-gold)] lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-nav"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="overflow-hidden border-t border-white/10 bg-black lg:hidden"
          >
            <div className="flex flex-col gap-2 px-4 py-4">
              {mainNav.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-3 py-3 text-center text-sm font-bold uppercase tracking-[0.1em]",
                      active
                        ? "border border-[var(--brand-gold)] text-[var(--brand-gold)]"
                        : "border border-transparent text-white/90",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/event#partners"
                onClick={() => setOpen(false)}
                className="header-cta-partner--mobile mt-1"
              >
                Become a Partner
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">{site.name}</span>
    </header>
  );
}
