import type { ExpertVoice } from "@/content/experts";

export function ExpertVoices({ items }: { items: ExpertVoice[] }) {
  return (
    <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
      {items.map((person) => (
        <article key={person.name} className="text-center">
          {/* Photo slot — replace with <img> when asset is ready */}
          <div className="relative mx-auto w-fit">
            <div className="hex-frame hex-photo-slot">
              {person.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.photo}
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center">
                  <span className="font-display text-2xl font-black text-white/90 sm:text-3xl">
                    {person.initials}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Photo
                  </span>
                </div>
              )}
            </div>
            <div className="hex-logo">{person.org}</div>
          </div>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
            {person.partner}
          </p>

          <blockquote className="relative mx-auto mt-3 max-w-xs">
            <span
              className="pointer-events-none absolute -left-1 -top-3 font-display text-4xl font-black italic leading-none text-[var(--brand-gold)]/35"
              aria-hidden
            >
              “
            </span>
            <p className="text-sm italic leading-relaxed text-[#333]">
              {person.quote}
            </p>
          </blockquote>

          <p className="mt-4 font-display text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--brand-gold-dark)]">
            {person.saying}
          </p>

          <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-black">
            {person.name}
            <br />
            <span className="mt-1 inline-block font-semibold normal-case tracking-normal text-[#666]">
              {person.role}
            </span>
          </p>
        </article>
      ))}
    </div>
  );
}
