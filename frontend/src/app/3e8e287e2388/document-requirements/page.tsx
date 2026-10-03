"use client";

import { FormEvent, useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiDelete, apiGet, apiPatch, apiPost, getStoredUser } from "@/lib/api";

type ReqItem = {
  id: string;
  name: string;
  evidenceType: string;
  mandatory: boolean;
  sortOrder: number;
  active: boolean;
};

function DocRequirementsInner() {
  const me = getStoredUser();
  const [items, setItems] = useState<ReqItem[]>([]);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [evidenceType, setEvidenceType] = useState("Statutory");

  function load() {
    apiGet<{ items: ReqItem[] }>("/api/admin/document-requirements")
      .then((d) => setItems(d.items))
      .catch((e) => setMsg(e instanceof Error ? e.message : "Failed"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await apiPost("/api/admin/document-requirements", {
        name,
        evidenceType,
        mandatory: true,
        active: true,
      });
      setName("");
      load();
      setMsg("Requirement added.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <PortalShell
      brand="Admin"
      subtitle="Mandatory evidence checklist"
      nav={secretariatNav}
      userLabel={me?.fullName ?? "Admin"}
    >
      <div className="border border-black/10 bg-white p-5 sm:p-6">
        <h1 className="font-display text-3xl font-black italic uppercase">Document Requirements</h1>
        <p className="mt-2 text-sm text-[#666]">
          Manage the mandatory document checklist shown to applicants and on admin review.
        </p>
        {msg && <p className="mt-4 text-sm text-[#555]">{msg}</p>}

        <form onSubmit={onCreate} className="mt-6 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input
            className="input"
            required
            minLength={2}
            placeholder="Document name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="input"
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value)}
          >
            <option>Statutory</option>
            <option>Financial</option>
            <option>Operational</option>
            <option>Other</option>
          </select>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>

        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-black/10 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-[#888]">
                  {item.evidenceType} · {item.mandatory ? "Mandatory" : "Optional"} ·{" "}
                  {item.active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost !px-3 !py-1 text-xs"
                  onClick={async () => {
                    await apiPatch(`/api/admin/document-requirements/${item.id}`, {
                      active: !item.active,
                    });
                    load();
                  }}
                >
                  {item.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="btn-ghost !px-3 !py-1 text-xs text-red-700"
                  onClick={async () => {
                    if (!window.confirm(`Delete “${item.name}”?`)) return;
                    await apiDelete(`/api/admin/document-requirements/${item.id}`);
                    load();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!items.length && <p className="text-sm text-[#666]">No requirements yet.</p>}
        </ul>
      </div>
    </PortalShell>
  );
}

export default function AdminDocRequirementsPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR"]} loginPath="/3e8e287e2388/login">
      <DocRequirementsInner />
    </AuthGate>
  );
}
