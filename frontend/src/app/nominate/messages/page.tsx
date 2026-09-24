"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Paperclip, Send } from "lucide-react";
import { applicantNav, PortalShell } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

type Clarification = {
  id: string;
  applicationId: string;
  type: string;
  title: string;
  deadline?: string;
  requiredDocument?: string;
  status: string;
  thread: { id: string; at: string; by: string; role: string; body: string; documentName?: string }[];
};

function isOfficial(role: string) {
  const r = role.toLowerCase();
  return r.includes("verif") || r.includes("secret") || r.includes("admin") || r.includes("jury");
}

function MessagesInner() {
  const [items, setItems] = useState<Clarification[]>([]);
  const [active, setActive] = useState<Clarification | null>(null);
  const [sent, setSent] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  function load(keepId?: string) {
    apiGet<{ clarifications: Clarification[] }>("/api/clarifications")
      .then((d) => {
        setItems(d.clarifications);
        const next =
          d.clarifications.find((c) => c.id === keepId) ??
          d.clarifications.find((c) => c.id === active?.id) ??
          d.clarifications[0] ??
          null;
        setActive(next);
      })
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.id, active?.thread.length]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    await apiPost(`/api/clarifications/${active.id}/respond`, {
      body: fd.get("body"),
      documentName: fd.get("documentName") || undefined,
    });
    setSent(true);
    form.reset();
    load(active.id);
  }

  const canReply =
    active &&
    (active.status === "OPEN" || active.status === "FURTHER" || active.status === "RESPONDED");

  return (
    <PortalShell
      brand="Applicant Portal"
      subtitle="Messages & Clarifications"
      nav={applicantNav}
      userLabel="Applicant"
    >
      <div className="relative mx-auto flex min-h-[min(78vh,52rem)] max-w-4xl flex-col overflow-hidden border border-black/10 bg-white shadow-[0_16px_40px_-28px_rgba(26,12,16,0.45)]">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <MessageCircle className="h-10 w-10 text-[var(--brand-gold)]" aria-hidden />
            <p className="font-display text-xl font-black italic uppercase">No thread selected</p>
            <p className="max-w-sm text-sm text-[#666]">
              {items.length
                ? "Open the chat picker to choose a clarification thread."
                : "You have no clarification requests yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-black/10 bg-gradient-to-r from-[#1a0a0e] via-[#2a1218] to-[#1a0a0e] px-4 py-4 text-white sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-[var(--brand-gold)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1a0c10]">
                  {active.type}
                </span>
                <span
                  className={cn(
                    "rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                    active.status === "OPEN"
                      ? "bg-white/15 text-[var(--brand-gold-light)]"
                      : "bg-white/10 text-white/70",
                  )}
                >
                  {active.status}
                </span>
              </div>
              <h1 className="mt-2 font-display text-lg font-black italic uppercase leading-tight sm:text-2xl">
                {active.title}
              </h1>
              <p className="mt-1.5 text-xs text-white/65 sm:text-sm">
                {active.applicationId}
                {active.deadline ? ` · Deadline ${active.deadline}` : ""}
                {active.requiredDocument ? ` · Need: ${active.requiredDocument}` : ""}
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f7f4f2] px-4 py-5 sm:px-6 sm:py-6">
              {active.thread.map((m) => {
                const mine = !isOfficial(m.role);
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[min(100%,28rem)] px-4 py-3 text-sm shadow-sm",
                        mine
                          ? "rounded-2xl rounded-br-md bg-[#1a0a0e] text-white"
                          : "rounded-2xl rounded-bl-md border border-black/8 bg-white text-[#1a0c10]",
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.1em]",
                          mine ? "text-[var(--brand-gold)]" : "text-[#888]",
                        )}
                      >
                        {m.by} · {m.role} · {new Date(m.at).toLocaleString()}
                      </p>
                      <p className="mt-2 leading-relaxed">{m.body}</p>
                      {m.documentName && (
                        <p
                          className={cn(
                            "mt-2 inline-flex items-center gap-1.5 text-xs",
                            mine ? "text-white/70" : "text-[#666]",
                          )}
                        >
                          <Paperclip size={12} aria-hidden />
                          {m.documentName}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>

            {canReply ? (
              <form
                className="shrink-0 border-t border-black/10 bg-white px-4 py-5 sm:px-6 sm:py-6"
                onSubmit={onSubmit}
              >
                <label className="label" htmlFor="clarification-body">
                  Write Response
                </label>
                <textarea
                  id="clarification-body"
                  className="input mt-1 min-h-40 resize-y text-base leading-relaxed sm:min-h-48"
                  name="body"
                  required
                  placeholder="Type your clarification reply…"
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="document-name">
                      Document name
                    </label>
                    <input
                      id="document-name"
                      className="input mt-1"
                      name="documentName"
                      placeholder="FY-1_Extract.pdf"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="document-file">
                      Camera / file
                    </label>
                    <input
                      id="document-file"
                      className="input mt-1"
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                    />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button type="submit" className="btn-primary inline-flex min-h-12 items-center gap-2 px-6">
                    <Send size={16} aria-hidden />
                    Submit Clarification
                  </button>
                  {sent && (
                    <p className="text-sm font-medium text-[var(--brand-gold-dark)]">
                      Response saved to thread.
                    </p>
                  )}
                </div>
              </form>
            ) : (
              <div className="shrink-0 border-t border-black/10 bg-[#f7f4f2] px-4 py-4 text-sm text-[#666] sm:px-6">
                This thread is closed — replies are not available.
              </div>
            )}
          </>
        )}
      </div>

      {/* Messenger-style floating thread picker */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
        {pickerOpen && (
          <div className="pointer-events-auto w-[min(calc(100vw-2rem),20rem)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_20px_50px_-18px_rgba(26,12,16,0.55)]">
            <div className="flex items-center justify-between border-b border-black/10 bg-[#1a0a0e] px-4 py-3 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold)]">
                  Threads
                </p>
                <p className="font-display text-sm font-black italic uppercase">
                  Clarifications
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-white/40 hover:text-white"
                aria-label="Close threads"
                onClick={() => setPickerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {!items.length ? (
                <li className="px-4 py-6 text-center text-sm text-[#666]">No clarifications.</li>
              ) : (
                items.map((c) => {
                  const on = active?.id === c.id;
                  return (
                    <li key={c.id} className="border-b border-black/5 last:border-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActive(c);
                          setSent(false);
                          setPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3.5 text-left transition",
                          on ? "bg-[#1a0a0e] text-white" : "hover:bg-[#f7f4f2]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase",
                            on
                              ? "bg-[var(--brand-gold)] text-[#1a0c10]"
                              : "bg-[var(--brand-gold)]/20 text-[var(--brand-gold-dark)]",
                          )}
                        >
                          {c.applicationId.slice(-4)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {c.applicationId}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block truncate text-xs",
                              on ? "text-white/65" : "text-[#666]",
                            )}
                          >
                            {c.title}
                          </span>
                          <span
                            className={cn(
                              "mt-1 inline-block text-[10px] font-bold uppercase tracking-[0.1em]",
                              on ? "text-[var(--brand-gold)]" : "text-[#888]",
                            )}
                          >
                            {c.status}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1a0c10] bg-gradient-to-br from-[#f5d56a] via-[#e8a914] to-[#c4890c] text-[#1a0c10] shadow-[0_12px_28px_-10px_rgba(196,137,12,0.7)] transition hover:scale-105 active:scale-95"
          aria-label={pickerOpen ? "Close threads" : "Open threads"}
          aria-expanded={pickerOpen}
        >
          {pickerOpen ? <X size={22} /> : <MessageCircle size={22} />}
          {items.length > 0 && !pickerOpen && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1a0a0e] px-1 text-[10px] font-bold text-[var(--brand-gold)]">
              {items.length}
            </span>
          )}
        </button>
      </div>
    </PortalShell>
  );
}

export default function MessagesPage() {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <MessagesInner />
    </AuthGate>
  );
}
