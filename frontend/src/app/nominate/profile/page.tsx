"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { applicantNav, PortalShell } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { MfaSettings } from "@/components/portal/MfaSettings";
import {
  IncompleteGateDialog,
  markIncompleteFields,
} from "@/components/portal/IncompleteGate";
import { useUnsavedProcessGuard } from "@/hooks/UnsavedProcessContext";
import { apiGet, apiPut, getStoredUser, getToken, setSession, type AuthUser } from "@/lib/api";

export type BusinessProfile = {
  legalName: string;
  brandName: string;
  constitution: string;
  established: string;
  industry: string;
  activity: string;
  website: string;
  linkedin: string;
  registeredAddress: string;
  mysuruAddress: string;
  pinCode: string;
  udyam: string;
  udyamDate: string;
  classification: string;
  pan: string;
  gstin: string;
  cin: string;
  employees: string;
  locations: string;
  repName: string;
  repDesignation: string;
  repEmail: string;
  repMobile: string;
};

const emptyProfile = (user = getStoredUser()): BusinessProfile => ({
  legalName: user?.orgName ?? "",
  brandName: "",
  constitution: "",
  established: "",
  industry: "",
  activity: "",
  website: "",
  linkedin: "",
  registeredAddress: "",
  mysuruAddress: "",
  pinCode: "",
  udyam: "",
  udyamDate: "",
  classification: "",
  pan: "",
  gstin: "",
  cin: "",
  employees: "",
  locations: "",
  repName: user?.fullName ?? "",
  repDesignation: "",
  repEmail: user?.email ?? "",
  repMobile: "",
});

function readProfileFromForm(form: HTMLFormElement): BusinessProfile {
  const fd = new FormData(form);
  return {
    legalName: String(fd.get("legalName") || ""),
    brandName: String(fd.get("brandName") || ""),
    constitution: String(fd.get("constitution") || ""),
    established: String(fd.get("established") || ""),
    industry: String(fd.get("industry") || ""),
    activity: String(fd.get("activity") || ""),
    website: String(fd.get("website") || ""),
    linkedin: String(fd.get("linkedin") || ""),
    registeredAddress: String(fd.get("registeredAddress") || ""),
    mysuruAddress: String(fd.get("mysuruAddress") || ""),
    pinCode: String(fd.get("pinCode") || ""),
    udyam: String(fd.get("udyam") || ""),
    udyamDate: String(fd.get("udyamDate") || ""),
    classification: String(fd.get("classification") || ""),
    pan: String(fd.get("pan") || ""),
    gstin: String(fd.get("gstin") || ""),
    cin: String(fd.get("cin") || ""),
    employees: String(fd.get("employees") || ""),
    locations: String(fd.get("locations") || ""),
    repName: String(fd.get("repName") || ""),
    repDesignation: String(fd.get("repDesignation") || ""),
    repEmail: String(fd.get("repEmail") || ""),
    repMobile: String(fd.get("repMobile") || ""),
  };
}

function BusinessProfileInner() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredUser());
  const [profile, setProfile] = useState<BusinessProfile>(emptyProfile);
  const [complete, setComplete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const [dirty, setDirty] = useState(false);

  const { allowNextNavigation } = useUnsavedProcessGuard({
    dirty: editing && dirty,
    onSave: async () => {
      const form = formRef.current;
      if (!form) return;
      await persist(readProfileFromForm(form), false);
    },
  });

  useEffect(() => {
    apiGet<{ profile: BusinessProfile | null; complete: boolean }>("/api/profile")
      .then((d) => {
        if (d.profile) {
          setProfile({ ...emptyProfile(), ...d.profile });
          setComplete(d.complete);
          setEditing(!d.complete);
        } else {
          setProfile(emptyProfile());
          setComplete(false);
          setEditing(true);
        }
      })
      .catch(() => {
        setProfile(emptyProfile());
        setEditing(true);
      })
      .finally(() => setLoading(false));

    apiGet<{ user: AuthUser }>("/api/auth/me")
      .then((d) => {
        setAuthUser(d.user);
        const token = getToken();
        if (token) setSession(token, d.user);
      })
      .catch(() => undefined);
  }, []);

  async function persist(body: BusinessProfile, goNext: boolean) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await apiPut<{ profile: BusinessProfile; complete: boolean }>(
        "/api/profile",
        body,
      );
      setProfile({ ...emptyProfile(), ...res.profile });
      setComplete(res.complete);
      setDirty(false);
      setEditing(false);
      setSaved(true);
      if (goNext) {
        allowNextNavigation();
        router.push("/nominate/categories");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const missing = markIncompleteFields(form);
    if (missing > 0) {
      setMissingCount(missing);
      setIncompleteOpen(true);
      return;
    }
    await persist(readProfileFromForm(form), true);
  }

  function tryContinueFromView() {
    if (complete) {
      allowNextNavigation();
      router.push("/nominate/categories");
      return;
    }
    setEditing(true);
    setMissingCount(0);
    requestAnimationFrame(() => {
      const n = markIncompleteFields(formRef.current);
      setMissingCount(n);
      setIncompleteOpen(true);
    });
  }

  return (
    <PortalShell
      brand="Applicant Portal"
      subtitle="Business Profile"
      nav={applicantNav}
      userLabel={profile.legalName || authUser?.orgName || "Applicant"}
    >
      <IncompleteGateDialog
        open={incompleteOpen}
        missingCount={missingCount || undefined}
        title="Required fields incomplete"
        allowSkip={false}
        message={
          missingCount
            ? `${missingCount} mandatory field${missingCount === 1 ? "" : "s"} marked with * still empty. Please complete them before continuing. Incomplete fields are highlighted in red.`
            : "Mandatory fields marked with * are still empty. Please complete them before continuing."
        }
        onStay={() => {
          setIncompleteOpen(false);
          if (!editing) setEditing(true);
        }}
      />

      <div className="border border-black/10 bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
              Step 2 of 4 · Profile
            </p>
            <h1 className="mt-2 font-display text-3xl font-black italic uppercase">
              Business Profile
            </h1>
            <p className="mt-2 text-sm text-[#666]">
              Fill your enterprise details once. After this you can choose award categories and
              submit your nomination.
            </p>
          </div>
          {!editing && !loading && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>

        <ol className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.1em]">
          {[
            ["Account", true],
            ["Business Profile", complete],
            ["Categories", false],
            ["Submit", false],
          ].map(([label, done]) => (
            <li
              key={String(label)}
              className={`border px-2.5 py-1 ${
                done ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/15" : "border-black/10 bg-[#f7f4f2]"
              }`}
            >
              {label}
            </li>
          ))}
        </ol>

        {saved && (
          <div className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
            {complete
              ? "Profile saved. Continue to choose award categories."
              : "Profile saved. Complete remaining required fields when you can."}
          </div>
        )}
        {error && (
          <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-[#666]">Loading profile…</p>
        ) : editing ? (
          <form
            ref={formRef}
            className="mt-8 grid gap-8 lg:grid-cols-3"
            noValidate
            onSubmit={onSave}
            onInput={() => setDirty(true)}
            onChange={() => setDirty(true)}
          >
            <FieldGroup title="Enterprise Information">
              <Field name="legalName" label="Legal Business Name" defaultValue={profile.legalName} required />
              <Field name="brandName" label="Brand / Trade Name" defaultValue={profile.brandName} />
              <Field name="constitution" label="Constitution Type" defaultValue={profile.constitution} required />
              <Field name="established" label="Date of Establishment" defaultValue={profile.established} type="date" required />
              <Field name="industry" label="Primary Industry" defaultValue={profile.industry} required />
              <Field name="activity" label="Business Activity" defaultValue={profile.activity} required />
              <Field name="website" label="Website" defaultValue={profile.website} />
              <Field name="linkedin" label="LinkedIn" defaultValue={profile.linkedin} />
              <Field name="registeredAddress" label="Registered Address" defaultValue={profile.registeredAddress} required />
              <Field name="mysuruAddress" label="Operational Address in Mysuru" defaultValue={profile.mysuruAddress} required />
              <Field name="pinCode" label="PIN Code" defaultValue={profile.pinCode} required />
            </FieldGroup>
            <FieldGroup title="MSME Information">
              <Field name="udyam" label="Udyam Registration Number" defaultValue={profile.udyam} required />
              <Field name="udyamDate" label="Udyam Registration Date" defaultValue={profile.udyamDate} type="date" required />
              <Field name="classification" label="MSME Classification" defaultValue={profile.classification} required />
              <Field name="pan" label="PAN" defaultValue={profile.pan} required />
              <Field name="gstin" label="GSTIN" defaultValue={profile.gstin} />
              <Field name="cin" label="CIN / LLPIN" defaultValue={profile.cin} />
              <Field name="employees" label="Number of Employees" defaultValue={profile.employees} required />
              <Field name="locations" label="Number of Locations" defaultValue={profile.locations} required />
            </FieldGroup>
            <FieldGroup title="Authorized Representative">
              <Field name="repName" label="Name" defaultValue={profile.repName} required />
              <Field name="repDesignation" label="Designation" defaultValue={profile.repDesignation} required />
              <Field name="repEmail" label="Email" defaultValue={profile.repEmail} type="email" required />
              <Field name="repMobile" label="Mobile" defaultValue={profile.repMobile} type="tel" required />
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save & Continue"}
                </button>
                {complete && (
                  <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                )}
              </div>
            </FieldGroup>
          </form>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <Section title="Enterprise Information">
              <Row label="Legal Business Name" value={profile.legalName} />
              <Row label="Brand / Trade Name" value={profile.brandName} />
              <Row label="Constitution" value={profile.constitution} />
              <Row label="Date of Establishment" value={profile.established} />
              <Row label="Primary Industry" value={profile.industry} />
              <Row label="Business Activity" value={profile.activity} />
              <Row label="Website" value={profile.website} />
              <Row label="LinkedIn" value={profile.linkedin} />
              <Row label="Registered Address" value={profile.registeredAddress} />
              <Row label="Operational Address in Mysuru" value={profile.mysuruAddress} />
              <Row label="PIN Code" value={profile.pinCode} />
            </Section>
            <Section title="MSME Information">
              <Row label="Udyam Registration Number" value={profile.udyam} />
              <Row label="Udyam Registration Date" value={profile.udyamDate} />
              <Row label="MSME Classification" value={profile.classification} />
              <Row label="PAN" value={profile.pan} />
              <Row label="GSTIN" value={profile.gstin} />
              <Row label="CIN / LLPIN" value={profile.cin} />
              <Row label="Number of Employees" value={profile.employees} />
              <Row label="Number of Locations" value={profile.locations} />
            </Section>
            <Section title="Authorized Representative">
              <Row label="Name" value={profile.repName} />
              <Row label="Designation" value={profile.repDesignation} />
              <Row label="Email" value={profile.repEmail} />
              <Row label="Mobile" value={profile.repMobile} />
              <button type="button" className="btn-primary mt-4" onClick={tryContinueFromView}>
                Continue to Categories
              </button>
            </Section>
          </div>
        )}
      </div>

      {authUser && (
        <div className="mt-6">
          <MfaSettings user={authUser} onUserChange={setAuthUser} />
        </div>
      )}
    </PortalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-black italic uppercase">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-black italic uppercase">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        className="input"
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || "—"}</p>
    </div>
  );
}

export default function BusinessProfilePage() {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <BusinessProfileInner />
    </AuthGate>
  );
}
