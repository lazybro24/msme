"use client";

import Link from "next/link";
import { use, useState } from "react";
import { PortalShell, juryNav } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { apiPost } from "@/lib/api";

function ConflictInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");

  return (
    <PortalShell
      brand="Jury Portal"
      subtitle="Conflict Declaration"
      nav={juryNav}
      userLabel="Jury Member"
    >
      <div className="mx-auto max-w-2xl border border-black/10 bg-white p-5 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand-gold-dark)]">
          Before access
        </p>
        <h1 className="mt-2 font-display text-3xl font-black italic uppercase">{id}</h1>
        <p className="mt-3 text-sm text-[#555]">
          Do you have any actual, potential or perceived conflict of interest involving this
          applicant?
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-[#666] sm:grid-cols-2">
          {[
            "Client / supplier / competitor",
            "Investment or employment",
            "Board / family / advisory relationship",
            "Material financial relationship",
          ].map((e) => (
            <li key={e} className="border border-black/5 bg-[#f7f4f2] px-3 py-2">
              {e}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className={`btn-secondary ${choice === "no" ? "ring-2 ring-[var(--brand-gold)]" : ""}`}
            onClick={() => setChoice("no")}
          >
            NO
          </button>
          <button
            type="button"
            className={`btn-secondary ${choice === "yes" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => setChoice("yes")}
          >
            YES
          </button>
        </div>
        {choice === "yes" && (
          <div className="mt-4">
            <label className="label">Brief explanation</label>
            <textarea
              className="input min-h-24"
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="mt-2 text-sm font-semibold text-red-700">
              Application becomes CONFLICT — ACCESS RESTRICTED. Secretariat reassigns.
            </p>
          </div>
        )}
        {done ? (
          <div className="mt-6 space-y-3">
            <div className="border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-3 text-sm">
              Conflict declaration recorded.
            </div>
            {choice === "no" && (
              <Link href={`/jury-portal/evaluate/${id}`} className="btn-primary">
                Continue to Evaluation
              </Link>
            )}
            {choice === "yes" && (
              <Link href="/jury-portal" className="btn-secondary">
                Return to My Evaluations
              </Link>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary mt-6"
            disabled={!choice || (choice === "yes" && note.length < 3)}
            onClick={async () => {
              try {
                await apiPost(`/api/evaluations/${id}/conflict`, {
                  hasConflict: choice === "yes",
                  note,
                });
                setDone(true);
              } catch (e) {
                alert(e instanceof Error ? e.message : "Could not save declaration");
              }
            }}
          >
            Submit Declaration
          </button>
        )}
      </div>
    </PortalShell>
  );
}

export default function ConflictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AuthGate roles={["JURY", "JURY_CHAIR", "ADMINISTRATOR"]} loginPath="/jury-portal/login">
      <ConflictInner params={params} />
    </AuthGate>
  );
}
