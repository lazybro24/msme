"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { PortalShell, juryNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { API_URL, getStoredUser, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

const topics = [
  "Evaluation Process",
  "Category Assignment",
  "Conflict of Interest",
  "Technical Problem",
  "Scoring Clarification",
  "Other",
];

function ContactInner() {
  const router = useRouter();
  const user = getStoredUser();
  const [topic, setTopic] = useState(topics[0]);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  function onPickImage(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setImage(null);
      setPreview("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, etc.).");
      return;
    }
    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk(false);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const message = String(fd.get("message") || "").trim();
    try {
      const body = new FormData();
      body.append("topic", `Jury · ${topic}`);
      body.append("message", message);
      if (image) body.append("attachment", image);

      const token = getToken();
      const res = await fetch(`${API_URL}/api/help`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not send query");
      }
      setOk(true);
      form.reset();
      onPickImage(null);
      setTimeout(() => router.push("/jury-portal"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send query");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      brand="Jury Portal"
      subtitle="Contact Secretariat"
      nav={juryNav}
      userLabel={user?.fullName ?? "Jury"}
    >
      <div className="mx-auto max-w-2xl border border-[#e8a914]/25 bg-white p-5 shadow-[0_14px_32px_-24px_rgba(26,24,20,0.3)] sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
          Contact Now
        </p>
        <h1 className="mt-1 font-display text-3xl font-black italic uppercase text-[#1a1814]">
          Send a Query
        </h1>
        <p className="mt-2 text-sm text-[#666]">
          Reach the Awards Secretariat about evaluations, assignments, or process questions. Your
          queries appear separately from nominees on your dashboard.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className={`px-3 py-2 text-xs font-bold uppercase ${
                topic === t
                  ? "bg-[#1a1814] text-[#f5d56a]"
                  : "border border-[#e8a914]/25 bg-[#faf6eb] text-[#1a1814]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="jury-message">
              Message
            </label>
            <textarea
              id="jury-message"
              className="input min-h-36"
              name="message"
              required
              minLength={5}
              placeholder="Describe your question for the secretariat…"
            />
          </div>

          <div>
            <p className="label">Image attachment (optional)</p>
            <p className="mt-1 text-xs text-[#666]">
              Attach a screenshot or photo that shows your concern. JPG/PNG · max 5MB.
            </p>
            {!preview ? (
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[#e8a914]/40 bg-[#faf6eb]/60 px-4 py-8 text-center transition hover:bg-[#faf6eb]">
                <ImagePlus className="h-6 w-6 text-[var(--brand-gold-dark)]" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#1a1814]">
                  Choose image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div className="relative mt-3 border border-[#e8a914]/30 bg-[#faf6eb]/40 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Attachment preview"
                  className="mx-auto max-h-56 max-w-full object-contain"
                />
                <p className="mt-2 truncate text-center text-xs text-[#666]">{image?.name}</p>
                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex items-center gap-1 border border-black/10 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1a1814]"
                  onClick={() => onPickImage(null)}
                >
                  <X className="h-3 w-3" aria-hidden />
                  Remove
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {ok && (
            <p className="text-sm font-medium text-[var(--brand-gold-dark)]">
              Query sent. Returning to dashboard…
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Submit Query"}
            </button>
            <Link href="/jury-portal" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </PortalShell>
  );
}

export default function JuryContactPage() {
  return (
    <AuthGate roles={["JURY", "JURY_CHAIR", "ADMINISTRATOR"]} loginPath="/jury-portal/login">
      <ContactInner />
    </AuthGate>
  );
}
