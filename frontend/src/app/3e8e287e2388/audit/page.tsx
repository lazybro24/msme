"use client";

import { useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, getStoredUser } from "@/lib/api";

type EventRow = {
  id: string;
  at: string;
  userId?: string | null;
  role?: string | null;
  action: string;
  applicationId?: string | null;
  reason?: string | null;
};

export default function AuditPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR", "OBSERVER", "JURY_CHAIR"]} loginPath="/3e8e287e2388/login">
      <AuditInner />
    </AuthGate>
  );
}

function AuditInner() {
  const me = getStoredUser();
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    apiGet<{ events: EventRow[] }>("/api/admin/audit")
      .then((d) => setEvents(d.events))
      .catch(() => setEvents([]));
  }, []);

  return (
    <PortalShell brand="Admin" subtitle="Audit reconstructability" nav={secretariatNav} userLabel={me?.fullName ?? "Admin"}>
      <h1 className="font-display text-3xl font-black italic uppercase">Audit Log</h1>
      <div className="mt-6 overflow-x-auto border border-black/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[0.03] text-[10px] uppercase tracking-wider text-[#666]">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Application</th>
              <th className="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-black/5">
                <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(e.at).toLocaleString()}</td>
                <td className="px-3 py-2 font-medium">{e.action}</td>
                <td className="px-3 py-2 text-xs">{e.role || "—"}</td>
                <td className="px-3 py-2 text-xs">{e.applicationId || "—"}</td>
                <td className="px-3 py-2 text-xs text-[#555]">{e.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length && <p className="p-4 text-sm text-[#666]">No audit events yet.</p>}
      </div>
    </PortalShell>
  );
}
