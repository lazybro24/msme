"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

type AppRow = {
  applicationId: string;
  categoryTitle: string;
  categoryCode?: string;
  sector: string;
  msme: string;
  status: string;
  assignedJuryIds: string[];
};

type JuryProfile = {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  designation?: string;
  affiliation?: string;
  expertise?: string;
  roles: string[];
  categoryCodes: string[];
  active: boolean;
};

type Category = { code: string; title: string };

function AssignmentsInner() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [profiles, setProfiles] = useState<JuryProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    designation: "Jury Member",
    expertise: "",
    categoryCodes: [] as string[],
  });

  const load = useCallback(() => {
    apiGet<{ applications: AppRow[] }>("/api/applications").then((d) => {
      const list = d.applications.filter((a) =>
        ["READY_FOR_JURY", "QUALIFIED", "VERIFICATION", "ELIGIBILITY_REVIEW", "JURY_EVALUATION"].includes(
          a.status,
        ),
      );
      setApps(list);
      const init: Record<string, string[]> = {};
      list.forEach((a) => {
        init[a.applicationId] = a.assignedJuryIds ?? [];
      });
      setSelected(init);
    });
    apiGet<{ profiles: JuryProfile[]; categories: Category[] }>("/api/admin/jury-profiles").then(
      (d) => {
        setProfiles(d.profiles);
        setCategories(d.categories);
      },
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(appId: string, juryId: string) {
    setSelected((prev) => {
      const cur = prev[appId] ?? [];
      if (cur.includes(juryId)) return { ...prev, [appId]: cur.filter((j) => j !== juryId) };
      if (cur.length >= 3) return prev;
      return { ...prev, [appId]: [...cur, juryId] };
    });
  }

  function toggleCategory(code: string) {
    setForm((f) => ({
      ...f,
      categoryCodes: f.categoryCodes.includes(code)
        ? f.categoryCodes.filter((c) => c !== code)
        : [...f.categoryCodes, code],
    }));
  }

  async function addJury(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await apiPost("/api/admin/jury-profiles", {
        ...form,
        mfaEnabled: true,
        active: true,
      });
      setMsg(`Added jury: ${form.fullName}`);
      setShowAdd(false);
      setForm({
        fullName: "",
        email: "",
        password: "",
        mobile: "",
        designation: "Jury Member",
        expertise: "",
        categoryCodes: [],
      });
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to add jury");
    } finally {
      setBusy(false);
    }
  }

  async function removeJury(p: JuryProfile) {
    if (!confirm(`Remove ${p.fullName} from jury?`)) return;
    setBusy(true);
    try {
      const res = await apiDelete<{ message?: string; deactivated?: boolean }>(
        `/api/admin/jury-profiles/${p.id}`,
      );
      setMsg(res.message || `${p.fullName} removed`);
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  const activeJury = profiles.filter((p) => p.active);

  return (
    <PortalShell
      brand="Secretariat"
      subtitle="Jury Assignment Console"
      nav={secretariatNav}
      userLabel="Awards Administrator"
    >
      <div className="border border-black/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
              Phase 3 · Assignment
            </p>
            <h1 className="mt-2 font-display text-3xl font-black italic uppercase">
              Assign Evaluators
            </h1>
            <p className="mt-2 text-sm text-[#666]">
              Manage jury profiles here, then assign them to applications ready for evaluation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? "Close" : "Add Jury"}
            </button>
            <Link href="/3e8e287e2388/jury-profiles" className="btn-secondary">
              Full Jury Profiles
            </Link>
          </div>
        </div>

        {msg && (
          <p className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
            {msg}
          </p>
        )}

        {showAdd && (
          <form onSubmit={addJury} className="mt-6 border border-black/10 bg-[#f7f4f2] p-4">
            <h2 className="font-display text-base font-black uppercase italic">Add Jury Member</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Expertise / evaluation focus (assign category)</label>
                <select
                  className="input"
                  defaultValue=""
                  onChange={(e) => {
                    const code = e.target.value;
                    if (!code) return;
                    const cat = categories.find((c) => c.code === code);
                    setForm((f) => ({
                      ...f,
                      expertise: cat?.title ?? code,
                      categoryCodes: f.categoryCodes.includes(code)
                        ? f.categoryCodes
                        : [...f.categoryCodes, code],
                    }));
                    e.target.value = "";
                  }}
                >
                  <option value="">Select a nominee category to assign…</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code} disabled={form.categoryCodes.includes(c.code)}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.categoryCodes.map((code) => {
                    const cat = categories.find((c) => c.code === code);
                    return (
                      <button
                        key={code}
                        type="button"
                        className="inline-flex items-center gap-2 border border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
                        onClick={() => toggleCategory(code)}
                      >
                        {code}
                        {cat ? ` · ${cat.title}` : ""}
                        <span aria-hidden>×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <button type="submit" className="btn-gold mt-4" disabled={busy}>
              {busy ? "Adding…" : "Add Jury"}
            </button>
          </form>
        )}

        <h2 className="mt-8 font-display text-lg font-black uppercase italic">Jury Profiles</h2>
        <div className="mt-3 space-y-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-3 ${
                p.active ? "border-black/10 bg-[#f7f4f2]" : "border-dashed border-black/20 opacity-60"
              }`}
            >
              <div>
                <p className="font-display text-sm font-bold uppercase">
                  {p.fullName}
                  {p.roles.includes("JURY_CHAIR") && (
                    <span className="ml-2 text-[10px] text-[var(--brand-gold-dark)]">CHAIR</span>
                  )}
                  {!p.active && (
                    <span className="ml-2 text-[10px] uppercase text-red-700">Inactive</span>
                  )}
                </p>
                <p className="text-sm text-[#666]">
                  {p.email}
                  {p.expertise ? ` · ${p.expertise}` : ""}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--brand-gold-dark)]">
                  {p.categoryCodes.length ? p.categoryCodes.join(" · ") : "All categories"}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/3e8e287e2388/jury-profiles"
                  className="btn-secondary !min-h-9 !px-3 !text-[10px]"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn-ghost !min-h-9 !px-3 text-red-700"
                  disabled={busy || !p.active}
                  onClick={() => removeJury(p)}
                >
                  Remove Jury
                </button>
              </div>
            </div>
          ))}
          {!profiles.length && (
            <p className="text-sm text-[#666]">No jury profiles yet. Click Add Jury to create one.</p>
          )}
        </div>

        <h2 className="mt-10 font-display text-lg font-black uppercase italic">
          Application Assignments
        </h2>
        <div className="mt-3 space-y-4">
          {apps.map((a) => {
            const picks = selected[a.applicationId] ?? [];
            return (
              <div key={a.applicationId} className="border border-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-bold uppercase tracking-tight">
                      {a.applicationId}
                    </p>
                    <p className="text-sm text-[#666]">
                      {a.categoryTitle} · {a.sector} · {a.msme}
                    </p>
                  </div>
                  <span className="badge-muted">Assigned: {picks.length} / 3</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {activeJury.map((j) => {
                    const codes = j.categoryCodes ?? [];
                    const fits =
                      !codes.length || !a.categoryCode || codes.includes(a.categoryCode);
                    return (
                      <label
                        key={j.id}
                        className={`flex items-center gap-2 border px-3 py-2 text-sm ${
                          picks.includes(j.id)
                            ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/10"
                            : fits
                              ? "border-black/10 bg-[#f7f4f2]"
                              : "border-black/10 bg-white opacity-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={picks.includes(j.id)}
                          onChange={() => toggle(a.applicationId, j.id)}
                        />
                        <span>
                          {j.fullName}
                          {codes.length > 0 && (
                            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-[#888]">
                              {codes.join(" · ")}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {!activeJury.length && (
                  <p className="mt-3 text-sm text-[#666]">Add jury profiles above before assigning.</p>
                )}
                <button
                  type="button"
                  className="btn-secondary mt-4"
                  disabled={picks.length < 3}
                  onClick={async () => {
                    try {
                      await apiPost(`/api/applications/${a.applicationId}/assign`, {
                        juryIds: picks,
                      });
                      setMsg(`Assignment saved for ${a.applicationId}`);
                      load();
                    } catch (e) {
                      setMsg(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  Save Assignment
                </button>
              </div>
            );
          })}
          {!apps.length && (
            <p className="border border-black/10 bg-[#f7f4f2] px-4 py-3 text-sm text-[#666]">
              No applications ready for jury assignment yet. Accept nominations on{" "}
              <Link href="/3e8e287e2388/applications" className="font-semibold underline">
                Applications
              </Link>
              . Jury profiles above are ready to use when applications arrive.
            </p>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

export default function JuryAssignmentPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR"]} loginPath="/3e8e287e2388/login">
      <AssignmentsInner />
    </AuthGate>
  );
}
