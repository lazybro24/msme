"use client";

import { FormEvent, useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiGet, apiPut, getStoredUser } from "@/lib/api";

function SettingsInner() {
  const me = getStoredUser();
  const [nominationsOpen, setNominationsOpen] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ settings: { nominationsOpen?: boolean; registrationOpen?: boolean } }>(
      "/api/admin/settings",
    )
      .then((d) => {
        setNominationsOpen(Boolean(d.settings.nominationsOpen ?? true));
        setRegistrationOpen(Boolean(d.settings.registrationOpen ?? true));
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "Failed to load settings"));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const d = await apiPut<{ settings: { nominationsOpen?: boolean; registrationOpen?: boolean } }>(
        "/api/admin/settings",
        { nominationsOpen, registrationOpen },
      );
      setNominationsOpen(Boolean(d.settings.nominationsOpen ?? true));
      setRegistrationOpen(Boolean(d.settings.registrationOpen ?? true));
      setMsg("Settings saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell brand="Admin" subtitle="Portal controls" nav={secretariatNav} userLabel={me?.fullName ?? "Admin"}>
      <div className="border border-black/10 bg-white p-5 sm:p-6 max-w-xl">
        <h1 className="font-display text-3xl font-black italic uppercase">Settings</h1>
        <p className="mt-2 text-sm text-[#666]">
          Open or close public registration and nominations. Closed registration returns an error on
          register.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSave}>
          <label className="flex items-center justify-between gap-3 border border-black/10 px-4 py-3">
            <span className="text-sm font-medium">Nominations open</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={nominationsOpen}
              onChange={(e) => setNominationsOpen(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 border border-black/10 px-4 py-3">
            <span className="text-sm font-medium">Registration open</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={registrationOpen}
              onChange={(e) => setRegistrationOpen(e.target.checked)}
            />
          </label>
          {msg && <p className="text-sm text-[#555]">{msg}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </form>
      </div>
    </PortalShell>
  );
}

export default function AdminSettingsPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR"]} loginPath="/3e8e287e2388/login">
      <SettingsInner />
    </AuthGate>
  );
}
