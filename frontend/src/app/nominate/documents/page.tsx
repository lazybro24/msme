"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { applicantNav, PortalShell } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { IncompleteGateDialog } from "@/components/portal/IncompleteGate";
import { useUnsavedProcessGuard } from "@/hooks/UnsavedProcessContext";
import { apiDelete, apiGet, getToken, getStoredUser, API_URL } from "@/lib/api";
import { authFileUrl } from "@/lib/files";

const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const evidenceTypes = [
  "Financial",
  "Statutory",
  "Operational",
  "Customer",
  "Employee",
  "Certification",
  "Technology",
  "Sustainability",
  "Media",
  "Other",
];

const mandatoryDefaults = [
  { name: "Udyam Certificate", evidenceType: "Statutory" },
  { name: "PAN", evidenceType: "Statutory" },
  { name: "GST Certificate", evidenceType: "Statutory" },
  { name: "Incorporation / Registration Proof", evidenceType: "Statutory" },
  { name: "Proof of Mysuru Operations", evidenceType: "Operational" },
  { name: "Financial / Performance Evidence", evidenceType: "Financial" },
  { name: "Authorized Applicant Declaration", evidenceType: "Statutory" },
];

type Doc = {
  id: string;
  name: string;
  evidenceType: string;
  period: string | null;
  description: string | null;
  visibility: string;
  fileUrl: string | null;
  fileName?: string | null;
  createdAt: string;
};

type MandatoryItem = {
  name: string;
  done: boolean;
  documentId: string | null;
  fileUrl: string | null;
  fileName?: string | null;
};

type DocsPayload = {
  documents: Doc[];
  mandatory: MandatoryItem[];
  completeCount: number;
  totalMandatory: number;
};

function fileHref(url?: string | null) {
  return authFileUrl(url);
}

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function DocumentsPage() {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <DocumentsInner />
    </AuthGate>
  );
}

function DocumentsInner() {
  const router = useRouter();
  const user = getStoredUser();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [mandatory, setMandatory] = useState<MandatoryItem[]>(
    mandatoryDefaults.map((m) => ({ name: m.name, done: false, documentId: null, fileUrl: null })),
  );
  const [completeCount, setCompleteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busyName, setBusyName] = useState("");
  const [extraBusy, setExtraBusy] = useState(false);
  const [categoryReady, setCategoryReady] = useState<boolean | null>(null);
  const [continueHref, setContinueHref] = useState("/nominate/dashboard");
  const [applicationRef, setApplicationRef] = useState("");
  const [sizeAlert, setSizeAlert] = useState<string | null>(null);
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function applyPayload(d: DocsPayload) {
    setDocs(d.documents);
    setMandatory(d.mandatory);
    setCompleteCount(d.completeCount);
  }

  function assertFileSize(file: File | null): file is File {
    if (!file) return false;
    if (file.size > MAX_UPLOAD_BYTES) {
      setSizeAlert(
        `Your file is ${formatMb(file.size)} MB. It should be less than ${MAX_UPLOAD_MB} MB.`,
      );
      return false;
    }
    return true;
  }

  function load() {
    setLoading(true);
    apiGet<DocsPayload>("/api/documents")
      .then(applyPayload)
      .catch((e) => setMsg(e instanceof Error ? e.message : "Could not load documents"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    apiGet<{ applications: { applicationId: string; status: string }[] }>("/api/applications")
      .then((d) => {
        const apps = d.applications ?? [];
        const ok = apps.length > 0;
        setCategoryReady(ok);
        if (ok) {
          const draft = apps.find((a) => a.status === "DRAFT") ?? apps[0];
          setContinueHref(`/nominate/applications/${draft.applicationId}`);
          setApplicationRef(draft.applicationId);
          load();
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setCategoryReady(false);
        setLoading(false);
      });
  }, []);

  async function uploadFile(opts: {
    name: string;
    evidenceType: string;
    period: string;
    description: string;
    visibility?: string;
    file: File;
  }) {
    const token = getToken();
    const fd = new FormData();
    fd.append("file", opts.file);
    fd.append("name", opts.name);
    fd.append("evidenceType", opts.evidenceType);
    fd.append("period", opts.period);
    fd.append("description", opts.description);
    fd.append("visibility", opts.visibility || "Confidential");
    if (applicationRef) fd.append("applicationId", applicationRef);

    const res = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
    }
    return data;
  }

  async function uploadMandatory(name: string, evidenceType: string, file: File | null) {
    if (!assertFileSize(file)) return;
    setBusyName(name);
    setMsg("");
    try {
      await uploadFile({
        name,
        evidenceType,
        period: "Current",
        description: `Mandatory · ${name}`,
        file,
      });
      setMsg(`${name} uploaded.`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyName("");
    }
  }

  async function onAddExtra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) {
      setMsg("Choose a file to upload.");
      return;
    }
    if (!assertFileSize(file)) {
      form.querySelector<HTMLInputElement>('input[type="file"]')!.value = "";
      return;
    }
    setExtraBusy(true);
    setMsg("");
    try {
      await uploadFile({
        name: String(fd.get("name") || "Untitled"),
        evidenceType: String(fd.get("type") || "Other"),
        period: String(fd.get("period") || "Current"),
        description: String(fd.get("description") || ""),
        visibility: String(fd.get("visibility") || "Confidential"),
        file,
      });
      setMsg("Document uploaded.");
      form.reset();
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setExtraBusy(false);
    }
  }

  async function removeDoc(id: string) {
    try {
      await apiDelete(`/api/documents/${id}`);
      setMsg("Document removed.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const allMandatoryDone = completeCount >= mandatory.length && mandatory.length > 0;
  const missingMandatory = mandatory.filter((m) => !m.done);

  const { allowNextNavigation } = useUnsavedProcessGuard({
    dirty: Boolean(categoryReady) && !allMandatoryDone && !loading,
    onSave: async () => {
      /* uploads are already persisted; this just acknowledges progress */
    },
  });

  function tryContinue() {
    if (allMandatoryDone) {
      allowNextNavigation();
      router.push(continueHref);
      return;
    }
    setHighlightMissing(true);
    setIncompleteOpen(true);
  }

  return (
    <PortalShell
      brand="Applicant Portal"
      subtitle="Business Documents"
      nav={applicantNav}
      userLabel={user?.fullName ?? "Applicant"}
    >
      <IncompleteGateDialog
        open={incompleteOpen}
        missingCount={missingMandatory.length}
        title="Required documents incomplete"
        allowSkip={false}
        message={`${missingMandatory.length} mandatory document${missingMandatory.length === 1 ? "" : "s"} still missing. Please upload all required documents before continuing. Incomplete uploads are highlighted in red.`}
        onStay={() => setIncompleteOpen(false)}
      />

      {sizeAlert && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1a1814]/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setSizeAlert(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md border border-[#e8a914]/35 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(26,24,20,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#1a1814] via-[#e8a914] to-[#f5d56a]" aria-hidden />
            <h2 className="mt-4 font-display text-xl font-black italic uppercase text-[#1a1814]">
              File too large
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#444]">{sizeAlert}</p>
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn-primary" onClick={() => setSizeAlert(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryReady === null || (categoryReady && loading) ? (
        <p className="text-sm text-[#666]">Loading…</p>
      ) : !categoryReady ? (
        <div className="mx-auto max-w-xl border border-black/10 bg-white p-6 text-center sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
            Step 3 required
          </p>
          <h1 className="mt-2 font-display text-2xl font-black italic uppercase">
            Save Categories First
          </h1>
          <p className="mt-3 text-sm text-[#666]">
            Select and save your award categories before uploading documents.
          </p>
          <Link href="/nominate/categories" className="btn-primary mt-6 inline-flex">
            Go to Categories
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="font-display text-3xl font-black italic uppercase">Documents</h1>
              <p className="mt-2 text-sm text-[#666]">
                Upload mandatory proof documents (max {MAX_UPLOAD_MB} MB each). These appear to jury
                under Supporting Evidence after verification.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary shrink-0 self-center sm:self-auto"
              onClick={tryContinue}
            >
              Continue to Review & Submit →
            </button>
          </div>

          {msg && (
            <p className="mt-4 border border-[#e8a914]/30 bg-[#faf6eb] px-4 py-3 text-sm text-[#1a1814]">
              {msg}
            </p>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="border border-black/10 bg-white p-5 sm:p-6">
              <h2 className="font-display text-2xl font-black italic uppercase">Mandatory Documents</h2>
              <p className="mt-1 text-sm text-[#666]">
                {completeCount} / {mandatory.length} complete
              </p>
              {loading ? (
                <p className="mt-4 text-sm text-[#666]">Loading…</p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {mandatory.map((m) => {
                    const meta = mandatoryDefaults.find((d) => d.name === m.name);
                    return (
                      <li
                        key={m.name}
                        className={`flex flex-wrap items-center justify-between gap-2 border px-3 py-2 ${
                          highlightMissing && !m.done
                            ? "border-red-500 bg-red-50 ring-1 ring-red-400"
                            : "border-black/5"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{m.name}</p>
                          <p className="mt-0.5 text-xs">
                            {m.done ? (
                              <span className="font-semibold text-[var(--brand-gold-dark)]">
                                Uploaded
                                {m.fileName ? (
                                  <span className="font-medium text-[#555]"> · {m.fileName}</span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="font-bold uppercase tracking-[0.1em] text-amber-700">
                                Pending
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {m.fileUrl && (
                            <a
                              href={fileHref(m.fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost !min-h-8 !px-2 !text-[10px]"
                            >
                              View
                            </a>
                          )}
                          {m.documentId && (
                            <button
                              type="button"
                              className="btn-ghost !min-h-8 !px-2 !text-[10px] text-red-700"
                              disabled={busyName === m.name}
                              onClick={() => void removeDoc(m.documentId!)}
                            >
                              Remove
                            </button>
                          )}
                          <label className="btn-secondary !min-h-8 cursor-pointer !px-2 !text-[10px]">
                            {busyName === m.name ? "Uploading…" : m.done ? "Replace" : "Upload"}
                            <input
                              ref={(el) => {
                                fileRefs.current[m.name] = el;
                              }}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className="sr-only"
                              disabled={busyName === m.name}
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                e.target.value = "";
                                void uploadMandatory(
                                  m.name,
                                  meta?.evidenceType || "Statutory",
                                  file,
                                );
                              }}
                            />
                          </label>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border border-black/10 bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-black italic uppercase">Additional Evidence</h2>
              <p className="mt-1 text-sm text-[#666]">
                Optional supporting files (max {MAX_UPLOAD_MB} MB each).
              </p>
              <form className="mt-4 space-y-3" onSubmit={onAddExtra}>
                <div>
                  <label className="label">Document Name</label>
                  <input className="input" name="name" required />
                </div>
                <div>
                  <label className="label">Evidence Type</label>
                  <select className="input" name="type" required defaultValue="">
                    <option value="" disabled>
                      Select
                    </option>
                    {evidenceTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Period</label>
                  <input className="input" name="period" placeholder="e.g. FY-1 / 2025" required />
                </div>
                <div>
                  <label className="label">Short Description</label>
                  <textarea className="input min-h-20" name="description" required />
                </div>
                <div>
                  <label className="label">Visibility</label>
                  <select className="input" name="visibility" defaultValue="Confidential">
                    <option>Confidential</option>
                    <option>Can Be Public</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    File <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="input"
                    type="file"
                    name="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={extraBusy}>
                  {extraBusy ? "Uploading…" : "Add Document"}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-6 border border-black/10 bg-white p-5 sm:p-6">
            <h2 className="font-display text-xl font-black italic uppercase">Library</h2>
            <ul className="mt-4 space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-start justify-between gap-2 border border-black/10 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{d.name}</p>
                    {d.fileName && (
                      <p className="mt-0.5 text-xs font-medium text-[var(--brand-gold-dark)]">
                        {d.fileName}
                      </p>
                    )}
                    <p className="text-xs text-[#666]">
                      {d.evidenceType}
                      {d.period ? ` · ${d.period}` : ""} · {d.visibility}
                    </p>
                    {d.description && <p className="mt-1 text-[#555]">{d.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.fileUrl && (
                      <a
                        href={fileHref(d.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary !min-h-8 !px-3 !text-[10px]"
                      >
                        Open
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-ghost !min-h-8 !px-2 !text-[10px]"
                      onClick={() => void removeDoc(d.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
              {!loading && !docs.length && (
                <p className="text-sm text-[#666]">No documents uploaded yet.</p>
              )}
            </ul>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
            {!allMandatoryDone && (
              <p className="text-center text-sm text-[#666] sm:mr-auto sm:text-left">
                {missingMandatory.length} of {mandatory.length} mandatory documents still pending.
              </p>
            )}
            <button type="button" className="btn-primary" onClick={tryContinue}>
              Continue to Review & Submit →
            </button>
          </div>
        </>
      )}
    </PortalShell>
  );
}
