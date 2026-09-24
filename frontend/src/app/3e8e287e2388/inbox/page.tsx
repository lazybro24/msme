"use client";

import { useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiDelete, apiGet, apiPatch, getStoredUser } from "@/lib/api";

type Enquiry = {
  id: string;
  fullName: string;
  email: string;
  organisation?: string | null;
  nature: string;
  message: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
};

type Partnership = {
  id: string;
  name: string;
  organisation: string;
  email: string;
  interest: string;
  message: string;
  status: string;
  createdAt: string;
};

type Help = {
  id: string;
  topic: string;
  message: string;
  status: string;
  userName: string;
  userEmail: string;
  createdAt: string;
};

export default function InboxPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR", "VERIFICATION"]} loginPath="/3e8e287e2388/login">
      <InboxInner />
    </AuthGate>
  );
}

function InboxInner() {
  const me = getStoredUser();
  const [tab, setTab] = useState<"enquiries" | "partnerships" | "help">("enquiries");
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [helpTickets, setHelp] = useState<Help[]>([]);
  const [msg, setMsg] = useState("");

  function load() {
    apiGet<{ enquiries: Enquiry[]; partnerships: Partnership[]; helpTickets: Help[] }>("/api/admin/inbox")
      .then((d) => {
        setEnquiries(d.enquiries);
        setPartnerships(d.partnerships);
        setHelp(d.helpTickets);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "Failed"));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PortalShell brand="Admin" subtitle="Enquiries · partners · help" nav={secretariatNav} userLabel={me?.fullName ?? "Admin"}>
      <h1 className="font-display text-3xl font-black italic uppercase">Inbox</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["enquiries", `Enquiries (${enquiries.length})`],
            ["partnerships", `Partnerships (${partnerships.length})`],
            ["help", `Help (${helpTickets.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "btn-gold" : "btn-ghost"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="mt-3 text-sm text-[var(--brand-gold-dark)]">{msg}</p>}

      {tab === "enquiries" && (
        <div className="mt-6 space-y-3">
          {enquiries.map((e) => (
            <article key={e.id} className="border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{e.fullName}</p>
                  <p className="text-xs text-[#666]">
                    {e.email} · {e.nature} · {e.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["OPEN", "IN_PROGRESS", "CLOSED", "ARCHIVED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn-ghost !px-2 !py-1 text-[10px]"
                      onClick={async () => {
                        await apiPatch(`/api/admin/inbox/enquiries/${e.id}`, { status: s });
                        load();
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1 text-[10px]"
                    onClick={async () => {
                      if (!confirm("Delete enquiry?")) return;
                      await apiDelete(`/api/admin/inbox/enquiries/${e.id}`);
                      load();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-[#444]">{e.message}</p>
            </article>
          ))}
          {!enquiries.length && <p className="text-sm text-[#666]">No enquiries yet.</p>}
        </div>
      )}

      {tab === "partnerships" && (
        <div className="mt-6 space-y-3">
          {partnerships.map((p) => (
            <article key={p.id} className="border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {p.name} · {p.organisation}
                  </p>
                  <p className="text-xs text-[#666]">
                    {p.email} · {p.interest} · {p.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["OPEN", "IN_PROGRESS", "CLOSED", "ARCHIVED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn-ghost !px-2 !py-1 text-[10px]"
                      onClick={async () => {
                        await apiPatch(`/api/admin/inbox/partnerships/${p.id}`, { status: s });
                        load();
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1 text-[10px]"
                    onClick={async () => {
                      if (!confirm("Delete?")) return;
                      await apiDelete(`/api/admin/inbox/partnerships/${p.id}`);
                      load();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-[#444]">{p.message}</p>
            </article>
          ))}
        </div>
      )}

      {tab === "help" && (
        <div className="mt-6 space-y-3">
          {helpTickets.map((h) => (
            <article key={h.id} className="border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{h.topic}</p>
                  <p className="text-xs text-[#666]">
                    {h.userName} · {h.userEmail} · {h.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["OPEN", "IN_PROGRESS", "CLOSED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn-ghost !px-2 !py-1 text-[10px]"
                      onClick={async () => {
                        await apiPatch(`/api/admin/inbox/help/${h.id}`, { status: s });
                        load();
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm text-[#444]">{h.message}</p>
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
