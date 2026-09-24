"use client";

import { FormEvent, useState } from "react";
import { apiPost } from "@/lib/api";
import { Band, BandHeader, Tile } from "@/components/public/Section";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

const partners = [
  "Banks & Financial Institutions",
  "Technology Companies",
  "Corporates",
  "Professional Service Providers",
  "Educational Institutions",
  "Industry Associations",
  "Business Organisations",
  "Media Organisations",
  "MSME Ecosystem Institutions",
];

const opportunities = [
  "Presenting / Principal Partner",
  "Banking Partner",
  "Technology Partner",
  "Knowledge Partner",
  "Category Partner",
  "Business Connect Partner",
  "MSME Showcase Partner",
  "Hospitality Partner",
  "Media Partner",
  "Supporting Partner",
];

export function PartnersSection() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost("/api/partnerships", {
        name: String(form.get("name") || ""),
        organisation: String(form.get("organisation") || ""),
        designation: String(form.get("designation") || ""),
        email: String(form.get("email") || ""),
        mobile: String(form.get("mobile") || ""),
        industry: String(form.get("industry") || ""),
        interest: String(form.get("interest") || ""),
        message: String(form.get("message") || ""),
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} (Is the backend running on port 4000?)`
          : "Could not submit partnership request.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Band tone="dark" id="partners">
      <BandHeader
        eyebrow="Partnerships"
        title="Partner With Mysuru's Business Growth Story"
        description="Engage meaningfully with entrepreneurs, businesses and the broader MSME ecosystem."
      />
      <div className="mt-10 split-rail !items-stretch">
        <Reveal>
          <h3 className="font-display text-lg font-black uppercase tracking-tight text-white">
            Potential Partners
          </h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {partners.map((p) => (
              <Tile key={p} tone="dark" className="!py-3 text-sm text-white/85">
                {p}
              </Tile>
            ))}
          </div>
          <h3 className="mt-10 font-display text-lg font-black uppercase tracking-tight text-white">
            Partnership Opportunities
          </h3>
          <ul className="mt-4 space-y-2">
            {opportunities.map((o) => (
              <li key={o} className="border-b border-white/10 py-2 text-sm text-white/70">
                {o}
              </li>
            ))}
          </ul>
          <div className="mt-8 border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
            Commercial partnership provides branding, visibility and engagement opportunities only.
            Sponsorship does not influence jury evaluation, finalist selection, rankings or award
            outcomes.
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <Tile tone="ink" className="h-full !p-6" id="request">
            <h2 className="font-display text-2xl font-black italic uppercase text-white">
              Request Partnership Details
            </h2>
            {sent ? (
              <div className="mt-6 border border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/10 px-4 py-5 text-sm text-white">
                Partnership enquiry submitted successfully.
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                {[
                  ["name", "Name"],
                  ["organisation", "Organisation"],
                  ["designation", "Designation"],
                  ["email", "Email"],
                  ["mobile", "Mobile"],
                  ["industry", "Industry"],
                ].map(([id, label]) => (
                  <div key={id}>
                    <label className="label !text-white/70" htmlFor={id}>
                      {label}
                    </label>
                    <input
                      id={id}
                      name={id}
                      required={id !== "designation" && id !== "industry"}
                      className="input"
                      type={id === "email" ? "email" : "text"}
                    />
                  </div>
                ))}
                <div>
                  <label className="label !text-white/70" htmlFor="interest">
                    Partnership Interest
                  </label>
                  <select id="interest" name="interest" className="input" required defaultValue="">
                    <option value="" disabled>
                      Select
                    </option>
                    {opportunities.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label !text-white/70" htmlFor="message">
                    Message
                  </label>
                  <textarea id="message" name="message" rows={4} className="input" required />
                </div>
                {error && <p className="text-sm text-red-300">{error}</p>}
                <button
                  type="submit"
                  className={cn("btn-gold w-full", loading && "btn-loading")}
                  disabled={loading}
                >
                  {loading ? "Submitting…" : "Submit Enquiry"}
                </button>
              </form>
            )}
          </Tile>
        </Reveal>
      </div>
    </Band>
  );
}
