"use client";

import { useEffect, useState, Children, cloneElement } from "react";
import { Pencil, Save } from "lucide-react";
import { PortalShell, juryNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { useConfirm } from "@/components/portal/ConfirmDialog";
import { MfaSettings } from "@/components/portal/MfaSettings";
import { apiGet, apiPatch, getToken, setSession, API_URL, type AuthUser } from "@/lib/api";
import { awardCategories } from "@/content/awards";

const categoryTitle = (code: string) =>
  awardCategories.find((c) => c.code === code)?.title ?? code;

function photoSrc(url?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

function ProfileInner() {
  const { confirm, dialog } = useConfirm();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [extrasBusy, setExtrasBusy] = useState(false);
  const [extrasMsg, setExtrasMsg] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [mobile, setMobile] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [editKey, setEditKey] = useState(0);

  function applyUser(u: AuthUser) {
    setUser(u);
    setMobile(u.mobile ?? "");
    setBio(u.bio ?? "");
    setLinkedin(u.linkedin ?? "");
    setWebsite(u.website ?? "");
  }

  function load() {
    apiGet<{ user: AuthUser }>("/api/auth/me")
      .then((d) => applyUser(d.user))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load profile"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function saveExtras() {
    const ok = await confirm({
      title: "Save profile changes",
      message: "Save changes to mobile, website, LinkedIn and bio?",
      confirmLabel: "Save",
    });
    if (!ok) return false;

    setExtrasBusy(true);
    setExtrasMsg("");
    try {
      const res = await apiPatch<{ user: AuthUser; message: string }>("/api/auth/me/profile", {
        mobile: mobile.trim(),
        bio: bio.trim(),
        linkedin: linkedin.trim(),
        website: website.trim(),
      });
      applyUser(res.user);
      const token = getToken();
      if (token) setSession(token, res.user);
      setExtrasMsg(res.message || "Saved.");
      setEditKey((k) => k + 1);
      return true;
    } catch (err) {
      setExtrasMsg(err instanceof Error ? err.message : "Could not save profile");
      return false;
    } finally {
      setExtrasBusy(false);
    }
  }

  async function uploadPhoto(file: File | null) {
    if (!file) return;
    const ok = await confirm({
      title: "Update photo",
      message: `Update your profile photo to “${file.name}”?`,
      confirmLabel: "Update photo",
    });
    if (!ok) return;

    setPhotoBusy(true);
    setPhotoMsg("");
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`${API_URL}/api/auth/me/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
      }
      applyUser(data.user);
      if (token) setSession(token, data.user);
      setPhotoMsg("Photo updated.");
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  }

  const codes = user?.categoryCodes ?? [];
  const roles = user?.roles ?? [];

  return (
    <PortalShell
      brand="Jury Portal"
      subtitle="My Profile"
      nav={juryNav}
      userLabel={user?.fullName ?? "Jury"}
    >
      {dialog}
      <div className="relative overflow-hidden border border-[#e8a914]/30 bg-white p-5 shadow-[0_20px_50px_-28px_rgba(26,24,20,0.35)] sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 18%, rgba(232,169,20,0.14), transparent 42%), radial-gradient(circle at 88% 8%, rgba(26,24,20,0.06), transparent 36%), linear-gradient(135deg, transparent 48%, rgba(232,169,20,0.05) 48.5%, rgba(232,169,20,0.05) 49%, transparent 49.5%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1a1814] via-[#e8a914] to-[#f5d56a]"
          aria-hidden
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4 border border-[#e8a914]/25 bg-white/85 p-4 shadow-[0_10px_28px_-20px_rgba(26,24,20,0.4)] backdrop-blur-sm sm:p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
              Jury account
            </p>
            <h1 className="mt-1 font-display text-3xl font-black italic uppercase text-[#1a1814]">
              My Profile
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden border-2 border-[#e8a914]/45 bg-[linear-gradient(145deg,#fffdf8,#f3ead8)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_24px_-16px_rgba(26,24,20,0.4)] sm:h-32 sm:w-32">
                {user.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc(user.photoUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-4xl font-black italic text-[#1a1814]/50">
                    {user.fullName.slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-gold-dark)]">
                  {roles.includes("JURY_CHAIR") ? "Jury Chair" : "Jury Member"}
                  {user.active === false ? " · Inactive" : " · Active"}
                </p>
                <p className="font-display text-lg font-black italic uppercase leading-tight text-[#1a1814] sm:text-xl">
                  {user.fullName}
                </p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 border border-[#e8a914]/40 bg-[#faf6eb] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#1a1814] shadow-[0_6px_14px_-12px_rgba(26,24,20,0.4)] transition hover:bg-[#f5d56a]/25">
                  <Pencil className="h-3 w-3 text-[var(--brand-gold-dark)]" aria-hidden />
                  {photoBusy ? "Uploading…" : "Change photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={photoBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      void uploadPhoto(file);
                    }}
                  />
                </label>
                {photoMsg && (
                  <p className="mt-1 text-xs text-[var(--brand-gold-dark)]">{photoMsg}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="relative mt-8 text-sm text-[#666]">Loading profile…</p>
        ) : error ? (
          <p className="relative mt-8 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            {error}
          </p>
        ) : !user ? (
          <p className="relative mt-8 text-sm text-[#666]">No profile found.</p>
        ) : (
          <div className="relative mt-6 space-y-6">
            <section className="border border-[#e8a914]/20 bg-white/90 p-4 shadow-[0_14px_32px_-24px_rgba(26,24,20,0.35)] backdrop-blur-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-[#e8a914]/20 pb-3">
                <span
                  className="h-8 w-1 bg-gradient-to-b from-[#1a1814] to-[#e8a914]"
                  aria-hidden
                />
                <h2 className="font-display text-lg font-black uppercase italic text-[#1a1814]">
                  Account details
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ReadOnlyField label="Email" value={user.email} />
                <ReadOnlyField label="Designation" value={user.designation || "—"} />
                <ReadOnlyField label="Affiliation" value={user.affiliation || "—"} />
                <ReadOnlyField label="Expertise" value={user.expertise || "—"} />
                <ReadOnlyField
                  label="Roles"
                  value={roles.map((r) => r.replaceAll("_", " ")).join(" · ") || "—"}
                />
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="label">Assigned categories</p>
                  {codes.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {codes.map((code) => (
                        <span
                          key={code}
                          className="border border-[#e8a914]/35 bg-gradient-to-br from-[#faf6eb] to-[#f5d56a]/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1a1814] shadow-[0_4px_10px_-8px_rgba(26,24,20,0.35)]"
                        >
                          {code} · {categoryTitle(code)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#666]">All categories</p>
                  )}
                </div>
              </div>
            </section>

            <section className="border border-[#e8a914]/20 bg-white/90 p-4 shadow-[0_14px_32px_-24px_rgba(26,24,20,0.35)] backdrop-blur-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3 border-b border-[#e8a914]/20 pb-3">
                <span
                  className="h-8 w-1 bg-gradient-to-b from-[#1a1814] to-[#e8a914]"
                  aria-hidden
                />
                <h2 className="font-display text-lg font-black uppercase italic text-[#1a1814]">
                  Contact & public profile
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <EditableField
                  key={`mobile-${editKey}`}
                  label="Mobile"
                  confirm={confirm}
                  onSave={saveExtras}
                  saving={extrasBusy}
                >
                  <input
                    className="min-h-[2.75rem] w-full border-0 bg-transparent py-2.5 pl-3.5 pr-10 text-sm outline-none"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91…"
                  />
                </EditableField>
                <EditableField
                  key={`website-${editKey}`}
                  label="Website"
                  confirm={confirm}
                  onSave={saveExtras}
                  saving={extrasBusy}
                >
                  <input
                    className="min-h-[2.75rem] w-full border-0 bg-transparent py-2.5 pl-3.5 pr-10 text-sm outline-none"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                  />
                </EditableField>
                <EditableField
                  key={`linkedin-${editKey}`}
                  label="LinkedIn"
                  confirm={confirm}
                  onSave={saveExtras}
                  saving={extrasBusy}
                >
                  <input
                    className="min-h-[2.75rem] w-full border-0 bg-transparent py-2.5 pl-3.5 pr-10 text-sm outline-none"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/…"
                  />
                </EditableField>
                <EditableField
                  key={`bio-${editKey}`}
                  label="Short bio"
                  className="sm:col-span-2 lg:col-span-3"
                  confirm={confirm}
                  onSave={saveExtras}
                  saving={extrasBusy}
                >
                  <textarea
                    className="min-h-[100px] w-full resize-y border-0 bg-transparent py-2.5 pl-3.5 pr-10 text-sm outline-none"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={2000}
                    placeholder="Background, domains, and evaluation focus…"
                  />
                </EditableField>
              </div>
              {extrasMsg && (
                <p className="mt-3 text-xs font-medium text-[var(--brand-gold-dark)]">{extrasMsg}</p>
              )}
            </section>

            {user && <MfaSettings user={user} onUserChange={applyUser} />}

            <p className="border border-dashed border-[#e8a914]/30 bg-white/70 px-3 py-2 text-xs text-[#666]">
              Name, categories and affiliation are managed by Admin. Bio, LinkedIn, website, mobile
              and Google Authenticator MFA are controlled by you.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-0 flex min-h-[2.75rem] items-center border border-[#e8a914]/20 bg-[linear-gradient(180deg,#ffffff,#faf7f1)] px-3 text-sm font-semibold text-[#1a1814] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {value}
      </div>
    </div>
  );
}

function EditableField({
  label,
  children,
  className,
  confirm,
  onSave,
  saving,
}: {
  label: string;
  children: React.ReactElement<{
    className?: string;
    readOnly?: boolean;
  }>;
  className?: string;
  confirm: (options: {
    title?: string;
    message: string;
    confirmLabel?: string;
  }) => Promise<boolean>;
  onSave: () => Promise<boolean>;
  saving?: boolean;
}) {
  const [unlocked, setUnlocked] = useState(false);

  async function requestEdit() {
    if (unlocked) return false;
    return confirm({
      title: "Edit field",
      message: `Do you want to edit “${label}”?`,
      confirmLabel: "Edit",
    });
  }

  async function requestSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    const ok = await onSave();
    if (ok) setUnlocked(false);
  }

  const child = Children.only(children);

  return (
    <div className={className}>
      <p className="label">{label}</p>
      <div
        className={`relative border border-[#9ca3af]/45 bg-[#e8eaed] shadow-[inset_0_1px_2px_rgba(26,24,20,0.06)] ${
          unlocked
            ? "focus-within:border-[#6b7280] focus-within:shadow-[0_0_0_3px_rgba(156,163,175,0.25)]"
            : "cursor-pointer hover:border-[#6b7280] hover:bg-[#dfe2e6]"
        }`}
        onClick={async (e) => {
          if (unlocked) return;
          e.preventDefault();
          if (await requestEdit()) {
            setUnlocked(true);
            const target = e.currentTarget.querySelector(
              "input, textarea",
            ) as HTMLInputElement | HTMLTextAreaElement | null;
            requestAnimationFrame(() => target?.focus());
          }
        }}
      >
        {cloneElement(child, {
          readOnly: !unlocked,
          className: `${child.props.className ?? ""} ${unlocked ? "cursor-text" : "pointer-events-none cursor-pointer"}`,
        })}
        {unlocked ? (
          <button
            type="button"
            title="Save"
            aria-label={`Save ${label}`}
            disabled={saving}
            onClick={requestSave}
            className="absolute right-2 top-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-[#e8a914]/40 bg-white text-[var(--brand-gold-dark)] shadow-sm transition hover:bg-[#faf6eb] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <Pencil
            className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-[#4b5563]/70"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

export default function JuryProfilePage() {
  return (
    <AuthGate roles={["JURY", "JURY_CHAIR", "ADMINISTRATOR"]} loginPath="/jury-portal/login">
      <ProfileInner />
    </AuthGate>
  );
}
