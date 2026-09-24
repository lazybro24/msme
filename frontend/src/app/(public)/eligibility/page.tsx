"use client";

import { useEffect } from "react";

/** Legacy route → Awards page participate section */
export default function EligibilityRedirect() {
  useEffect(() => {
    window.location.replace("/awards#participate");
  }, []);
  return (
    <div className="page-awards-bg min-h-[40vh]">
      <p className="container-page py-20 text-sm text-[#666]">Redirecting to Awards · Participate…</p>
    </div>
  );
}
