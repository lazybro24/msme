"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { applicantNav, PortalShell } from "@/components/portal/PortalShell";
import { AuthGate } from "@/components/portal/AuthGate";
import { usePageProcess } from "@/hooks/PageProcessContext";
import { apiGet, getStoredUser } from "@/lib/api";

function DeclarationGateInner() {
  const router = useRouter();
  const pageProcess = usePageProcess();
  const user = getStoredUser();
  const [msg, setMsg] = useState("Opening declaration…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await apiGet<{
          applications: { applicationId: string; status: string; categoryTitle: string }[];
        }>("/api/applications");
        if (cancelled) return;
        const apps = d.applications || [];
        const draft =
          apps.find((a) => a.status === "DRAFT") ||
          apps.find((a) => a.status !== "DRAFT");
        if (!draft) {
          setMsg("No nomination found yet. Complete the nomination form first.");
          return;
        }
        pageProcess.navigate(
          `/nominate/applications/${draft.applicationId}?focus=declaration`,
          "Loading declaration…",
          { replace: true },
        );
      } catch {
        if (!cancelled) {
          setMsg("Could not open declaration. Try again from your nomination form.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageProcess, router]);

  return (
    <PortalShell
      brand="Applicant Portal"
      subtitle="Declaration form"
      nav={applicantNav}
      userLabel={user?.fullName ?? "Applicant"}
    >
      <div className="mx-auto max-w-lg border border-black/10 bg-white p-6 text-center sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
          Step 6
        </p>
        <h1 className="mt-2 font-display text-2xl font-black italic uppercase">
          Business Declaration
        </h1>
        <p className="mt-3 text-sm text-[#666]">{msg}</p>
        <Link href="/nominate/applications" className="btn-secondary mt-6 inline-flex">
          Open nomination form
        </Link>
      </div>
    </PortalShell>
  );
}

export default function DeclarationPage() {
  return (
    <AuthGate roles={["APPLICANT", "ADMINISTRATOR"]} loginPath="/nominate/login">
      <DeclarationGateInner />
    </AuthGate>
  );
}
