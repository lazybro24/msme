"use client";

import Link from "next/link";
import { Band, BandHeader } from "@/components/public/Section";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { EligibilitySections } from "@/components/public/EligibilitySections";
import { CategoryCard } from "@/components/awards/CategoryCard";
import { awardCategories } from "@/content/awards";

export default function AwardsPage() {
  const featured = awardCategories.find((c) => !c.directApply) ?? awardCategories[0];
  const direct = awardCategories.filter((c) => c.directApply);

  return (
    <>
      <Band tone="light" id="categories">
        <BandHeader
          eyebrow="2026 Categories"
          title="Choose Your Category"
          description="Direct-apply categories plus one qualification-based honour — MSME of the Year."
        />

        <div className="mt-10 space-y-4">
          <CategoryCard category={featured} variant="featured" />

          <Stagger className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {direct.map((c) => (
              <StaggerItem key={c.slug} className="h-full min-h-0">
                <CategoryCard category={c} variant="standard" />
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/awards#participate"
            className="inline-flex text-sm font-bold uppercase tracking-[0.1em] text-[var(--ink)] underline-offset-4 hover:underline"
          >
            Eligibility Requirements →
          </Link>
        </div>
      </Band>

      <EligibilitySections />
    </>
  );
}
