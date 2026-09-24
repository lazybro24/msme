"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiDelete, apiGet, apiPatch, apiPost, getStoredUser } from "@/lib/api";

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  designation: string;
  orgName: string;
  roles: string[];
  mfaEnabled: boolean;
  active: boolean;
  activeSessions: number;
  createdAt: string;
};

const ROLE_OPTIONS = [
  "APPLICANT",
  "VERIFICATION",
  "ADMINISTRATOR",
  "JURY",
  "JURY_CHAIR",
  "OBSERVER",
] as const;

export default function UsersAdminPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR"]} loginPath="/3e8e287e2388/login">
      <UsersInner />
    </AuthGate>
  );
}

function UsersInner() {
  const me = getStoredUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    designation: "",
    orgName: "",
    roles: ["APPLICANT"] as string[],
    mfaEnabled: false,
    active: true,
  });

  function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    apiGet<{ users: AdminUser[] }>(`/api/admin/users?${params}`)
      .then((d) => setUsers(d.users))
      .catch((e) => setMsg(e instanceof Error ? e.message : "Failed to load"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHint = useMemo(() => `${users.length} users`, [users.length]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setForm({
      fullName: "",
      email: "",
      password: "",
      mobile: "",
      designation: "",
      orgName: "",
      roles: ["APPLICANT"],
      mfaEnabled: false,
      active: true,
    });
  }

  function openEdit(u: AdminUser) {
    setCreating(false);
    setEditing(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      password: "",
      mobile: u.mobile,
      designation: u.designation,
      orgName: u.orgName,
      roles: u.roles,
      mfaEnabled: u.mfaEnabled,
      active: u.active,
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      if (creating) {
        await apiPost("/api/admin/users", form);
        setMsg("User created");
      } else if (editing) {
        await apiPatch(`/api/admin/users/${editing.id}`, {
          fullName: form.fullName,
          email: form.email,
          mobile: form.mobile,
          designation: form.designation,
          orgName: form.orgName,
          roles: form.roles,
          mfaEnabled: form.mfaEnabled,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
        setMsg("User updated");
      }
      setCreating(false);
      setEditing(null);
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  function toggleRole(r: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
    }));
  }

  return (
    <PortalShell brand="Admin" subtitle="User accounts & credentials" nav={secretariatNav} userLabel={me?.fullName ?? "Admin"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black italic uppercase">Users</h1>
          <p className="mt-1 text-sm text-[#555]">{filteredHint}</p>
        </div>
        <button type="button" className="btn-gold" onClick={openCreate}>
          Add user
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          className="input-field max-w-xs"
          placeholder="Search name / email / org"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input-field max-w-[12rem]" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="button" className="btn-ghost" onClick={load}>
          Search
        </button>
      </div>

      {msg && <p className="mt-4 text-sm text-[var(--brand-gold-dark)]">{msg}</p>}

      {(creating || editing) && (
        <form onSubmit={onSave} className="mt-6 space-y-3 border border-black/10 bg-white p-4">
          <h2 className="font-display text-lg font-bold uppercase">{creating ? "Create user" : "Edit user"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input className="input-field" required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input-field" placeholder={creating ? "Password" : "New password (optional)"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={creating} />
            <input className="input-field" placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <input className="input-field" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <input className="input-field" placeholder="Organisation" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <label key={r} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} />
                {r}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.mfaEnabled} onChange={(e) => setForm({ ...form, mfaEnabled: e.target.checked })} />
              MFA enabled
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-gold">
              Save
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto border border-black/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[0.03] text-[10px] uppercase tracking-wider text-[#666]">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Sessions</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-black/5">
                <td className="px-3 py-2 font-medium">{u.fullName}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 text-xs">{u.roles.join(", ")}</td>
                <td className="px-3 py-2">{u.activeSessions}</td>
                <td className="px-3 py-2">{u.active ? "Active" : "Off"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-1 text-xs"
                      onClick={async () => {
                        await apiPost(`/api/admin/users/${u.id}/revoke-sessions`, {});
                        setMsg(`Revoked sessions for ${u.email}`);
                        load();
                      }}
                    >
                      Force logout
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-1 text-xs"
                      onClick={async () => {
                        if (!confirm(`Delete or deactivate ${u.email}?`)) return;
                        const r = await apiDelete<{ message?: string }>(`/api/admin/users/${u.id}`);
                        setMsg(r.message || "User removed");
                        load();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
