"use client";

import { PageHero } from "@/components/public/PageHero";
import { Band, Tile } from "@/components/public/Section";
import { PartnersSection } from "@/components/public/PartnersSection";
import { Reveal } from "@/components/motion/Reveal";

export default function EventPage() {
  return (
    <>
      <PageHero eyebrow="Event" title="Event Details" />

      <Band tone="light" id="details">
        <div className="split-rail">
          <Reveal>
            <p className="section-eyebrow">Experience</p>
            <h2 className="section-title mt-3">Event Experience</h2>
            <ul className="mt-6 space-y-2">
              {[
                "MSME Growth Summit",
                "MSME Showcase",
                "Business Connect Lounge",
                "Finance & Growth Desk",
                "Finalists Gallery",
                "Grand Awards Ceremony",
                "Networking Dinner",
              ].map((item) => (
                <li key={item} className="tile-light px-3 py-2.5 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <Tile tone="ink" className="p-6 sm:p-8">
              <h2 className="font-display text-2xl font-black italic uppercase text-white">
                Event Information
              </h2>
              <dl className="mt-6 space-y-5 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold)]">
                    Event Date
                  </dt>
                  <dd className="mt-1 font-display text-lg font-black uppercase text-white">
                    To Be Announced
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold)]">
                    Venue
                  </dt>
                  <dd className="mt-1 font-display text-lg font-black uppercase text-white">
                    Mysuru — To Be Announced
                  </dd>
                </div>
              </dl>
              <div className="mt-8">
                <button type="button" className="btn-secondary opacity-60" disabled>
                  Register to Attend
                </button>
                <p className="mt-4 text-xs text-white/45">
                  Registration opens once date and venue are confirmed.
                </p>
              </div>
            </Tile>
          </Reveal>
        </div>
      </Band>

      <PartnersSection />
    </>
  );
}
