"use client";

import { CategoryBackdrop } from "@/components/awards/CategoryIcon";
import { type AwardCategory } from "@/content/awards";
import { cn } from "@/lib/utils";

export function CategoryCard({
  category: c,
  variant = "standard",
}: {
  category: AwardCategory;
  variant?: "featured" | "standard";
}) {
  return (
    <article
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden border border-black/10",
        variant === "featured" && "min-h-[16rem] sm:min-h-[18rem]",
        variant === "standard" && "min-h-[13.5rem]",
      )}
    >
      <CategoryBackdrop
        code={c.code}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          variant === "featured"
            ? "bg-gradient-to-r from-black/88 via-black/55 to-black/20"
            : "bg-gradient-to-t from-black/90 via-black/50 to-black/15",
        )}
      />
      <div
        className={cn(
          "relative z-[1] flex h-full flex-1 flex-col justify-between p-5 sm:p-6",
          variant === "featured" && "min-h-[16rem] max-w-3xl sm:min-h-[18rem] sm:p-8",
          variant === "standard" && "min-h-[13.5rem]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold)]">
            {c.number} · {c.code}
          </p>
          <span
            className={cn(
              "font-display font-black italic leading-none text-white/25",
              variant === "featured" ? "text-5xl sm:text-6xl" : "text-3xl",
            )}
            aria-hidden
          >
            {c.number}
          </span>
        </div>
        <div>
          <h2
            className={cn(
              "font-display font-bold uppercase tracking-tight text-white",
              variant === "featured" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
            )}
          >
            {c.title}
          </h2>
          <p
            className={cn(
              "mt-2 leading-relaxed text-white/80",
              variant === "featured" ? "text-sm sm:text-base" : "line-clamp-3 text-sm",
            )}
          >
            {c.overview}
          </p>
        </div>
      </div>
    </article>
  );
}
