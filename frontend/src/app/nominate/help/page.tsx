"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { applicantNav, PortalShell } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiPost } from "@/lib/api";

const topics = [
  "Application Question",
  "Technical Problem",
  "Eligibility Clarification",
  "Document Upload Issue",
  "Other",
];

function HelpInner() {
  const [topic, setTopic] = useState(topics[0]);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk(false);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await apiPost("/api/help", {
        topic,
        message: fd.get("message"),
      });
      setOk(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell brand="Applicant Portal" subtitle="Help & Support" nav={applicantNav} userLabel="Applicant">
      <div className="mx-auto max-w-2xl border border-black/10 bg-white p-5 sm:p-8">
        <h1 className="font-display text-3xl font-black italic uppercase">Need Help?</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className={`px-3 py-2 text-xs font-bold uppercase ${
                topic === t ? "bg-black text-white" : "bg-[#f7f4f2]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="label">Message</label>
            <textarea className="input min-h-28" name="message" required />
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit Ticket"}
          </button>
          {ok && <p className="text-sm text-[var(--brand-gold-dark)]">Ticket created.</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
        <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/contact#faq" className="hover:underline">
            FAQ
          </Link>
          <Link href="/award-rules" className="hover:underline">
            Award Rules
          </Link>
          <Link href="/about#integrity" className="hover:underline">
            Integrity Charter
          </Link>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}

export default function HelpPage() {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <HelpInner />
    </AuthGate>
  );
}
