import Link from "next/link";

export function PageHero({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="page-hero-stage relative z-[1]">
      <div className="container-page flex min-h-[140px] flex-col items-center justify-center py-8 text-center sm:min-h-[160px] sm:py-10">
        <div className="band-rule mb-3 w-16" aria-hidden />
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand-gold)] sm:text-[11px]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 max-w-4xl font-display text-xl font-black italic uppercase leading-[1.05] tracking-tight sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="type-lead mx-auto mt-2 max-w-2xl !text-white text-sm leading-relaxed">
            {description}
          </p>
        )}
        {(primaryHref || secondaryHref) && (
          <div className="mt-5 flex w-full max-w-md flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
            {primaryHref && primaryLabel && (
              <Link href={primaryHref} className="btn-gold">
                {primaryLabel}
              </Link>
            )}
            {secondaryHref && secondaryLabel && (
              <Link href={secondaryHref} className="btn-outline-light">
                {secondaryLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
