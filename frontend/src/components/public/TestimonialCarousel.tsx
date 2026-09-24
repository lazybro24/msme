"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Testimonial = {
  initials: string;
  name: string;
  role: string;
  quote: string;
  org: string;
};

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const [start, setStart] = useState(0);
  const visible = useMemo(() => {
    const next = [];
    for (let i = 0; i < 3; i += 1) {
      next.push(items[(start + i) % items.length]);
    }
    return next;
  }, [items, start]);

  return (
    <div className="mt-10 flex items-center gap-3 sm:gap-4">
      <button
        type="button"
        className="nav-arrow shrink-0"
        aria-label="Previous testimonials"
        onClick={() => setStart((s) => (s - 1 + items.length) % items.length)}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="grid flex-1 gap-8 md:grid-cols-3">
        {visible.map((t) => (
          <article key={t.name} className="text-center">
            <div className="relative mx-auto w-fit">
              <div className="hex-frame">
                <span className="font-display text-3xl font-black text-white/90">
                  {t.initials}
                </span>
              </div>
              <div className="hex-logo">{t.org}</div>
            </div>
            <p className="mx-auto mt-6 max-w-xs text-sm italic leading-relaxed text-[#333]">
              “{t.quote}”
            </p>
            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-black">
              {t.name}
              <br />
              <span className="font-semibold text-[#666]">{t.role}</span>
            </p>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="nav-arrow shrink-0"
        aria-label="Next testimonials"
        onClick={() => setStart((s) => (s + 1) % items.length)}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
