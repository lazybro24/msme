"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PortalShell, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiDelete, apiGet, apiPatch, apiPost, API_URL, getToken } from "@/lib/api";

type Category = { code: string; title: string };

type JuryProfile = {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  designation: string;
  affiliation: string;
  expertise: string;
  bio: string;
  linkedin: string;
  website: string;
  notes: string;
  roles: string[];
  categoryCodes: string[];
  mfaEnabled: boolean;
  active: boolean;
  photoUrl?: string;
};

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  mobile: "",
  designation: "Jury Member",
  affiliation: "",
  expertise: "",
  bio: "",
  linkedin: "",
  website: "",
  notes: "",
  categoryCodes: [] as string[],
  isChair: false,
  mfaEnabled: true,
  active: true,
};

function JuryProfilesInner() {
  const [profiles, setProfiles] = useState<JuryProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const load = useCallback(() => {
    apiGet<{ profiles: JuryProfile[]; categories: Category[] }>("/api/admin/jury-profiles")
      .then((d) => {
        setProfiles(d.profiles);
        setCategories(d.categories);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview("");
    setShowForm(true);
    setMsg("");
  }

  function startEdit(p: JuryProfile) {
    setEditingId(p.id);
    setForm({
      fullName: p.fullName,
      email: p.email,
      password: "",
      mobile: p.mobile,
      designation: p.designation || "Jury Member",
      affiliation: p.affiliation,
      expertise: p.expertise,
      bio: p.bio || "",
      linkedin: p.linkedin || "",
      website: p.website || "",
      notes: p.notes,
      categoryCodes: [...p.categoryCodes],
      isChair: p.roles.includes("JURY_CHAIR"),
      mfaEnabled: p.mfaEnabled,
      active: p.active,
    });
    setPhotoFile(null);
    setPhotoPreview(p.photoUrl ? `${API_URL}${p.photoUrl}` : "");
    setShowForm(true);
    setMsg("");
  }

  function toggleCategory(code: string) {
    setForm((f) => ({
      ...f,
      categoryCodes: f.categoryCodes.includes(code)
        ? f.categoryCodes.filter((c) => c !== code)
        : [...f.categoryCodes, code],
    }));
  }

  async function uploadPhoto(profileId: string) {
    if (!photoFile) return;
    const token = getToken();
    const fd = new FormData();
    fd.append("photo", photoFile);
    const res = await fetch(`${API_URL}/api/admin/jury-profiles/${profileId}/photo`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Photo upload failed");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          fullName: form.fullName,
          email: form.email,
          mobile: form.mobile,
          designation: form.designation,
          affiliation: form.affiliation,
          expertise: form.expertise,
          bio: form.bio,
          linkedin: form.linkedin,
          website: form.website,
          notes: form.notes,
          categoryCodes: form.categoryCodes,
          isChair: form.isChair,
          mfaEnabled: form.mfaEnabled,
          active: form.active,
        };
        if (form.password.trim()) body.password = form.password;
        await apiPatch(`/api/admin/jury-profiles/${editingId}`, body);
        await uploadPhoto(editingId);
        setMsg("Jury profile updated.");
      } else {
        if (!form.password.trim()) throw new Error("Password is required for new jury profiles");
        const created = await apiPost<{ profile: JuryProfile }>("/api/admin/jury-profiles", form);
        await uploadPhoto(created.profile.id);
        setMsg("Jury profile created.");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setPhotoFile(null);
      setPhotoPreview("");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeProfile(p: JuryProfile) {
    if (!confirm(`Remove / deactivate ${p.fullName}?`)) return;
    setBusy(true);
    try {
      const res = await apiDelete<{ message?: string; deactivated?: boolean }>(
        `/api/admin/jury-profiles/${p.id}`,
      );
      setMsg(res.message || (res.deactivated ? "Deactivated." : "Removed."));
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      brand="Admin"
      subtitle="Jury Profile Management"
      nav={secretariatNav}
      userLabel="Awards Administrator"
    >
      <div className="border border-black/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
              Admin · Jury
            </p>
            <h1 className="mt-2 font-display text-2xl font-black italic uppercase sm:text-3xl">
              Jury Profiles
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#666]">
              Create, edit or remove jury accounts. Set email, password, MFA, and which award
              categories each juror may evaluate.
            </p>
          </div>
          <button type="button" className="btn-gold" onClick={startCreate}>
            Add Jury Profile
          </button>
        </div>

        {msg && (
          <p className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
            {msg}
          </p>
        )}

        {showForm && (
          <form onSubmit={onSubmit} className="mt-6 border border-black/10 bg-[#f7f4f2] p-4 sm:p-5">
            <h2 className="font-display text-lg font-black uppercase italic">
              {editingId ? "Edit Jury Profile" : "New Jury Profile"}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden border border-black/15 bg-white">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold uppercase text-[#888]">No photo</span>
                )}
              </div>
              <div>
                <label className="label">Profile photo</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setPhotoFile(file);
                    setPhotoPreview(file ? URL.createObjectURL(file) : photoPreview);
                  }}
                />
                <p className="mt-1 text-xs text-[#666]">JPG/PNG · added by Admin on create/edit</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                <label className="label">Email (login)</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">
                  Password {editingId ? "(leave blank to keep)" : ""}
                </label>
                <input
                  className="input"
                  type="password"
                  minLength={8}
                  required={!editingId}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Mobile</label>
                <input
                  className="input"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Designation</label>
                <input
                  className="input"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Affiliation / organisation</label>
                <input
                  className="input"
                  value={form.affiliation}
                  onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Expertise / evaluation focus (assign category)</label>
                <div className="flex flex-col gap-2 sm:flex-row">
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
                </div>
                <p className="mt-2 text-xs text-[#666]">
                  Pick from award categories. Assigned categories appear below — remove any you don’t need.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.categoryCodes.length === 0 && (
                    <span className="text-sm text-[#888]">No categories assigned yet (juror can evaluate all).</span>
                  )}
                  {form.categoryCodes.map((code) => {
                    const cat = categories.find((c) => c.code === code);
                    return (
                      <button
                        key={code}
                        type="button"
                        className="inline-flex items-center gap-2 border border-[var(--brand-gold)] bg-[var(--brand-gold)]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            categoryCodes: f.categoryCodes.filter((c) => c !== code),
                            expertise:
                              f.categoryCodes.filter((c) => c !== code).length === 0
                                ? ""
                                : categories.find(
                                    (c) => c.code === f.categoryCodes.filter((x) => x !== code).slice(-1)[0],
                                  )?.title ?? f.expertise,
                          }))
                        }
                      >
                        {code}
                        {cat ? ` · ${cat.title}` : ""}
                        <span aria-hidden>×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">LinkedIn</label>
                <input
                  className="input"
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/…"
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  className="input"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Short bio</label>
                <textarea
                  className="input min-h-[88px]"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Background and evaluation focus…"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Internal notes</label>
                <textarea
                  className="input min-h-[72px]"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isChair}
                  onChange={(e) => setForm({ ...form, isChair: e.target.checked })}
                />
                Jury Chair role
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.mfaEnabled}
                  onChange={(e) => setForm({ ...form, mfaEnabled: e.target.checked })}
                />
                MFA enabled
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="submit" className="btn-gold" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Save changes" : "Create profile"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 space-y-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`border px-4 py-4 ${p.active ? "border-black/10 bg-[#f7f4f2]" : "border-dashed border-black/20 bg-white opacity-70"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden border border-black/10 bg-white">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${API_URL}${p.photoUrl}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#aaa]">
                        {p.fullName.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                  <p className="font-display text-base font-bold uppercase tracking-tight">
                    {p.fullName}
                    {p.roles.includes("JURY_CHAIR") && (
                      <span className="ml-2 text-[10px] font-bold text-[var(--brand-gold-dark)]">
                        CHAIR
                      </span>
                    )}
                    {!p.active && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-red-700">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[#555]">
                    {p.email}
                    {p.mobile ? ` · ${p.mobile}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#777]">
                    {[p.designation, p.affiliation, p.expertise].filter(Boolean).join(" · ") ||
                      "No profile details"}
                  </p>
                  {p.bio && (
                    <p className="mt-2 line-clamp-2 text-xs text-[#666]">{p.bio}</p>
                  )}
                  {(p.linkedin || p.website) && (
                    <p className="mt-1 text-[10px] text-[#888]">
                      {[p.linkedin && "LinkedIn", p.website && "Website"].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-gold-dark)]">
                    Categories:{" "}
                    {p.categoryCodes.length ? p.categoryCodes.join(", ") : "All categories"}
                  </p>
                  {p.notes && <p className="mt-1 text-xs text-[#888]">{p.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary !min-h-9 !px-3" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !min-h-9 !px-3 text-red-700"
                    disabled={busy}
                    onClick={() => removeProfile(p)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!profiles.length && (
            <p className="text-sm text-[#666]">No jury profiles yet. Add the first one.</p>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

export default function JuryProfilesPage() {
  return (
    <AuthGate roles={["ADMINISTRATOR"]} loginPath="/3e8e287e2388/login">
      <JuryProfilesInner />
    </AuthGate>
  );
}
