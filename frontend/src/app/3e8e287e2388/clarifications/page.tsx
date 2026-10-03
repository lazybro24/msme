"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPost, getStoredUser } from "@/lib/api";

type ThreadMsg = {
  id: string;
  at: string;
  by: string;
  role?: string;
  body: string;
};

type Clarification = {
  id: string;
  applicationId: string;
  type: string;
  title: string;
  deadline?: string;
  requiredDocument?: string;
  status: string;
  thread: ThreadMsg[];
};

function ClarificationsInner() {
  const me = getStoredUser();
  const [items, setItems] = useState<Clarification[]>([]);
  const [filter, setFilter] = useState("OPEN");
  const [msg, setMsg] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  function load() {
    apiGet<{ clarifications: Clarification[] }>("/api/clarifications")
      .then((d) => setItems(d.clarifications))
      .catch((e) => setMsg(e instanceof Error ? e.message : "Failed to load"));
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (filter === "ALL") return items;
    if (filter === "OPEN") return items.filter((c) => c.status === "OPEN" || c.status === "RESPONDED");
    return items.filter((c) => c.status === filter);
  }, [items, filter]);

  async function sendReply(id: string) {
    const body = (reply[id] || "").trim();
    if (body.length < 2) return;
    setBusyId(id);
    setMsg("");
    try {
      await apiPost(`/api/clarifications/${id}/respond`, { body });
      setReply((r) => ({ ...r, [id]: "" }));
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setBusyId("");
    }
  }

  async function closeItem(id: string) {
    setBusyId(id);
    try {
      await apiPost(`/api/clarifications/${id}/close`, { body: "Closed by secretariat" });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusyId("");
    }
  }

  return (
    <PortalShell brand="Admin" subtitle="Clarification queue" nav={secretariatNav} userLabel={me?.fullName ?? "Admin"}>
      <div className="border border-black/10 bg-white p-5 sm:p-6">
        <h1 className="font-display text-3xl font-black italic uppercase">Clarifications</h1>
        <p className="mt-2 text-sm text-[#666]">
          Review applicant responses, reply, or close requests.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["OPEN", "Active"],
            ["RESPONDED", "Responded"],
            ["CLOSED", "Closed"],
            ["ALL", "All"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "btn-primary" : "btn-ghost"}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {msg && <p className="mt-4 text-sm text-red-700">{msg}</p>}
        <div className="mt-6 space-y-4">
          {visible.map((c) => (
            <article key={c.id} className="border border-black/10 bg-[#f7f4f2] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/3e8e287e2388/applications/${c.applicationId}`}
                    className="font-semibold text-[var(--brand-gold-dark)]"
                  >
                    {c.applicationId}
                  </Link>
                  <h2 className="mt-1 font-display text-lg font-black italic uppercase">{c.title}</h2>
                  <p className="text-xs text-[#888]">
                    {c.type}
                    {c.deadline ? ` · Deadline ${c.deadline}` : ""}
                    {c.requiredDocument ? ` · Doc: ${c.requiredDocument}` : ""}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#555]">
                  {c.status}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {(c.thread || []).map((t) => (
                  <li key={t.id} className="border border-black/5 bg-white px-3 py-2 text-sm">
                    <p className="text-[10px] uppercase tracking-wide text-[#888]">
                      {t.by} · {t.role || "—"} · {new Date(t.at).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{t.body}</p>
                  </li>
                ))}
              </ul>
              {c.status !== "CLOSED" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="input min-h-20 bg-white"
                    placeholder="Reply to applicant…"
                    value={reply[c.id] || ""}
                    onChange={(e) => setReply((r) => ({ ...r, [c.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busyId === c.id}
                      onClick={() => sendReply(c.id)}
                    >
                      Send reply
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busyId === c.id}
                      onClick={() => closeItem(c.id)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
          {!visible.length && <p className="text-sm text-[#666]">No clarifications in this filter.</p>}
        </div>
      </div>
    </PortalShell>
  );
}

export default function AdminClarificationsPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR", "VERIFICATION"]} loginPath="/3e8e287e2388/login">
      <ClarificationsInner />
    </AuthGate>
  );
}
