"use client";

import { FormEvent, useState } from "react";
import { faqs } from "@/content/faqs";
import { apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { Band, BandHeader } from "@/components/public/Section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const natures = [
  { label: "Nomination Support", value: "NOMINATION_SUPPORT" },
  { label: "Eligibility Question", value: "ELIGIBILITY_QUESTION" },
  { label: "Partnership", value: "PARTNERSHIP" },
  { label: "Event Participation", value: "EVENT_PARTICIPATION" },
  { label: "Media / PR", value: "MEDIA_PR" },
  { label: "Jury / Institutional Enquiry", value: "JURY_INSTITUTIONAL" },
  { label: "Other", value: "OTHER" },
] as const;

const channels = [
  {
    title: "Awards Secretariat",
    body: "Official email, phone and office details will be published once frozen.",
    accent: "#e8a914",
  },
  {
    title: "Response Time",
    body: "We aim to respond to enquiry submissions during working days.",
    accent: "#2dd4bf",
  },
  {
    title: "Before You Write",
    body: "Check FAQs and eligibility requirements — many answers are already published.",
    accent: "#7ec8ff",
  },
];

export function ContactFaqSections() {
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost("/api/enquiries", {
        fullName: String(form.get("fullName") || ""),
        organisation: String(form.get("organisation") || ""),
        designation: String(form.get("designation") || ""),
        mobile: String(form.get("mobile") || ""),
        email: String(form.get("email") || ""),
        nature: String(form.get("nature") || "OTHER"),
        message: String(form.get("message") || ""),
      });
      setSent(true);
      toast.push({
        title: "Enquiry submitted",
        description: "The Awards Secretariat will respond shortly.",
        tone: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? `${err.message} (Is the backend running on port 4000?)`
          : "Could not submit enquiry.";
      setError(message);
      toast.push({ title: "Submission failed", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Band tone="light-alt" id="faq">
        <BandHeader
          eyebrow="FAQ"
          title="Frequently Asked Questions"
          description="Clear answers on eligibility, evaluation, integrity and recognition."
        />
        <Stagger className="mt-8 space-y-3">
          {faqs.map((item, i) => (
            <StaggerItem key={item.q}>
              <details className="contact-faq group overflow-hidden border border-black/10 bg-gradient-to-br from-white to-[#f8f4f0] open:border-[var(--brand-gold)]/55 open:shadow-[0_14px_32px_-22px_rgba(0,0,0,0.35)]">
                <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-4 font-display text-sm font-bold uppercase tracking-tight text-black sm:px-5">
                  <span className="mt-0.5 shrink-0 text-[var(--brand-gold-dark)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{item.q}</span>
                  <span
                    className="mt-0.5 text-[var(--brand-gold-dark)] transition group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="border-t border-black/10 px-4 pb-4 pt-3 text-sm leading-relaxed text-[#555] sm:px-5 sm:pl-[3.25rem]">
                  {item.a}
                </p>
              </details>
            </StaggerItem>
          ))}
        </Stagger>
      </Band>

      <Band tone="dark" id="enquiry">
        <BandHeader
          eyebrow="Enquiry"
          title="How Can We Help?"
          description="Tell us what you need — nomination support, partnerships, media, or something else."
        />

        <Stagger className="mt-8 grid gap-3 sm:grid-cols-3">
          {channels.map((c) => (
            <StaggerItem key={c.title}>
              <div className="relative h-full overflow-hidden border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] p-4">
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: c.accent }}
                  aria-hidden
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: c.accent }}>
                  {c.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{c.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-8">
          <Reveal>
            <div className="contact-form relative mx-auto max-w-3xl overflow-hidden border border-[var(--brand-gold)]/35 p-5 sm:p-7">
              <div className="contact-form__bg" aria-hidden />
              <div className="relative z-[1]">
                <h2 className="font-display text-2xl font-black italic uppercase text-white">
                  Submit Enquiry
                </h2>
                <p className="mt-2 text-sm text-white/65">
                  All fields are required. We&apos;ll route your message to the right desk.
                </p>

                {sent ? (
                  <div className="mt-6 border border-[var(--brand-gold)]/45 bg-[var(--brand-gold)]/15 px-4 py-6 text-sm text-white">
                    <p className="font-display text-lg font-black uppercase italic text-[var(--brand-gold)]">
                      Enquiry received
                    </p>
                    <p className="mt-2 text-white/85">
                      Thank you. The Awards Secretariat will respond shortly.
                    </p>
                    <button
                      type="button"
                      className="btn-outline-light mt-5"
                      onClick={() => setSent(false)}
                    >
                      Send another enquiry
                    </button>
                  </div>
                ) : (
                  <form className="contact-form-fields mt-6 space-y-4" onSubmit={onSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["fullName", "Full Name"],
                        ["organisation", "Organisation"],
                        ["designation", "Designation"],
                        ["mobile", "Mobile Number"],
                      ].map(([id, label]) => (
                        <div key={id}>
                          <label className="contact-label" htmlFor={id}>
                            {label}
                          </label>
                          <input
                            id={id}
                            name={id}
                            required
                            className="contact-input"
                            type="text"
                            autoComplete={
                              id === "fullName"
                                ? "name"
                                : id === "organisation"
                                  ? "organization"
                                  : id === "mobile"
                                    ? "tel"
                                    : "off"
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="contact-label" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        required
                        className="contact-input"
                        type="email"
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <label className="contact-label" htmlFor="nature">
                        Nature of Enquiry
                      </label>
                      <select
                        id="nature"
                        name="nature"
                        className="contact-input"
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choose an option
                        </option>
                        {natures.map((n) => (
                          <option key={n.value} value={n.value}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="contact-label" htmlFor="message">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        className="contact-input contact-textarea"
                        required
                        placeholder="Share a short note about how we can help…"
                      />
                    </div>
                    {error && (
                      <p className="border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      className={cn("btn-gold w-full", loading && "btn-loading")}
                      disabled={loading}
                    >
                      {loading ? "Submitting…" : "Submit Enquiry"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </Band>
    </>
  );
}
