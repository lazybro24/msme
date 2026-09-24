"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { PortalShell, StatusPill, secretariatNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { API_URL, apiGet, apiPost } from "@/lib/api";
import { authFileUrl } from "@/lib/files";

type App = {
  applicationId: string;
  organisationName: string;
  categoryTitle: string;
  sector: string;
  msme: string;
  status: string;
  evidenceStrength?: string;
};

type Doc = {
  id: string;
  name: string;
  evidenceType: string;
  period: string | null;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
};

type Mandatory = {
  name: string;
  done: boolean;
  documentId: string | null;
  fileUrl: string | null;
  fileName: string | null;
};

function fileHref(url?: string | null) {
  return authFileUrl(url);
}

function DetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [app, setApp] = useState<App | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [mandatory, setMandatory] = useState<Mandatory[]>([]);
  const [showClarify, setShowClarify] = useState(false);
  const [msg, setMsg] = useState("");

  function loadDocs() {
    apiGet<{ documents: Doc[]; mandatory: Mandatory[] }>(`/api/documents/application/${id}`)
      .then((d) => {
        setDocs(d.documents);
        setMandatory(d.mandatory);
      })
      .catch(() => {
        setDocs([]);
        setMandatory([]);
      });
  }

  useEffect(() => {
    apiGet<{ application: App }>(`/api/applications/${id}`)
      .then((d) => setApp(d.application))
      .catch(() => setApp(null));
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onClarify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/clarifications", {
        applicationId: id,
        type: String(fd.get("type") || "General"),
        title: String(fd.get("title") || "Clarification required"),
        message: String(fd.get("message") || ""),
        deadline: String(fd.get("deadline") || ""),
        requiredDocument: String(fd.get("doc") || ""),
      });
      setMsg("Clarification request sent");
      setShowClarify(false);
      const refreshed = await apiGet<{ application: App }>(`/api/applications/${id}`);
      setApp(refreshed.application);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!app) {
    return (
      <PortalShell brand="Admin" subtitle={id} nav={secretariatNav} userLabel="Verification">
        <p className="text-sm text-[#666]">Loading application…</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      brand="Admin"
      subtitle={app.applicationId}
      nav={secretariatNav}
      userLabel="Verification Team"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div className="border border-black/10 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-black italic uppercase">
                  {app.organisationName}
                </h1>
                <p className="mt-1 text-sm text-[#666]">
                  {app.categoryTitle} · {app.sector} · {app.msme}
                </p>
              </div>
              <StatusPill status={app.status.replaceAll("_", " ")} />
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase text-[#888]">Application ID</dt>
                <dd className="font-semibold">{app.applicationId}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-[#888]">Evidence strength</dt>
                <dd className="font-semibold">{app.evidenceStrength ?? "—"}</dd>
              </div>
            </dl>
            {msg && (
              <p className="mt-4 border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
                {msg}
              </p>
            )}
            {showClarify && (
              <form onSubmit={onClarify} className="mt-6 space-y-3 border border-black/10 bg-[#f7f4f2] p-4">
                <h2 className="font-display text-lg font-black italic uppercase">
                  Request Clarification
                </h2>
                <div>
                  <label className="label">Type</label>
                  <select name="type" className="input" defaultValue="Financial">
                    <option>Financial</option>
                    <option>Statutory</option>
                    <option>Operational</option>
                    <option>General</option>
                  </select>
                </div>
                <div>
                  <label className="label">Title</label>
                  <input name="title" className="input" required defaultValue="Additional information required" />
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea name="message" className="input min-h-24" required />
                </div>
                <div>
                  <label className="label">Required document</label>
                  <input name="doc" className="input" placeholder="FY-1 audited extract" />
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <input name="deadline" className="input" type="date" required />
                </div>
                <button type="submit" className="btn-primary">
                  Send Clarification Request
                </button>
              </form>
            )}
          </div>

          <div className="border border-black/10 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-black italic uppercase">Uploaded documents</h2>
                <p className="mt-1 text-xs text-[#666]">
                  Mandatory {mandatory.filter((m) => m.done).length}/{mandatory.length} complete
                </p>
              </div>
              <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={loadDocs}>
                Refresh
              </button>
            </div>

            <ul className="mt-4 space-y-2">
              {mandatory.map((m) => (
                <li
                  key={m.name}
                  className="flex flex-wrap items-center justify-between gap-2 border border-black/10 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[#888]">
                      {m.done ? "Uploaded" : "Missing"}
                      {m.fileName ? ` · ${m.fileName}` : ""}
                    </p>
                  </div>
                  {m.fileUrl ? (
                    <a
                      href={fileHref(m.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold uppercase tracking-wide text-[var(--brand-gold-dark)] underline-offset-2 hover:underline"
                    >
                      Open
                    </a>
                  ) : (
                    <span className="text-xs text-[#aaa]">—</span>
                  )}
                </li>
              ))}
            </ul>

            {docs.length > 0 && (
              <>
                <h3 className="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#888]">
                  All files
                </h3>
                <ul className="mt-2 space-y-2">
                  {docs.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 border border-black/5 bg-[#fafafa] px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-[#666]">
                          {d.evidenceType}
                          {d.period ? ` · ${d.period}` : ""}
                          {d.fileName ? ` · ${d.fileName}` : ""}
                        </p>
                      </div>
                      {d.fileUrl ? (
                        <a
                          href={fileHref(d.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold uppercase tracking-wide text-[var(--brand-gold-dark)] underline-offset-2 hover:underline"
                        >
                          View / download
                        </a>
                      ) : (
                        <span className="text-xs text-[#aaa]">No file</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!docs.length && (
              <p className="mt-4 text-sm text-[#666]">No documents uploaded for this application yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-3 border border-black/10 bg-white p-5">
          <Link href="/3e8e287e2388/verification" className="btn-primary w-full">
            Evidence Verification
          </Link>
          <button type="button" className="btn-secondary w-full" onClick={() => setShowClarify(true)}>
            Request Clarification
          </button>
          <div className="border-t border-black/10 pt-3">
            <label className="label">Change status</label>
            <select className="input" defaultValue={app.status} id="admin-status">
              {[
                "DRAFT",
                "SUBMITTED",
                "ELIGIBILITY_REVIEW",
                "CLARIFICATION_REQUIRED",
                "VERIFICATION",
                "QUALIFIED",
                "READY_FOR_JURY",
                "NOT_QUALIFIED",
                "DISQUALIFIED",
                "JURY_EVALUATION",
                "FINALIST",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ghost mt-2 w-full"
              onClick={async () => {
                const el = document.getElementById("admin-status") as HTMLSelectElement | null;
                const status = el?.value || app.status;
                const reason = prompt("Reason for status change (required)") || "";
                if (reason.length < 3) {
                  setMsg("Reason required (min 3 characters)");
                  return;
                }
                try {
                  await apiPost(`/api/admin/applications/${id}/status`, { status, reason });
                  setMsg(`Status set to ${status}`);
                  const refreshed = await apiGet<{ application: App }>(`/api/applications/${id}`);
                  setApp(refreshed.application);
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Status change failed");
                }
              }}
            >
              Apply status
            </button>
            <button
              type="button"
              className="btn-ghost mt-2 w-full"
              onClick={async () => {
                const reason = prompt("Reason to reopen as draft (audited)") || "";
                if (reason.length < 5) {
                  setMsg("Reopen reason required");
                  return;
                }
                try {
                  await apiPost(`/api/admin/applications/${id}/reopen`, { reason });
                  setMsg("Application reopened as draft");
                  const refreshed = await apiGet<{ application: App }>(`/api/applications/${id}`);
                  setApp(refreshed.application);
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Reopen failed");
                }
              }}
            >
              Reopen to draft
            </button>
          </div>
          <Link href="/3e8e287e2388/applications" className="btn-ghost w-full">
            Back to List
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}

export default function SecretariatApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AuthGate roles={["ADMINISTRATOR", "VERIFICATION", "JURY_CHAIR"]} loginPath="/3e8e287e2388/login">
      <DetailInner params={params} />
    </AuthGate>
  );
}

