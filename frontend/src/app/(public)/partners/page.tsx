"use client";

import { useEffect } from "react";

/** Legacy route → merged Event page (Partners section) */
export default function PartnersRedirect() {
  useEffect(() => {
    window.location.replace("/event#partners");
  }, []);
  return (
    <div className="page-awards-bg min-h-[40vh]">
      <p className="container-page py-20 text-sm text-[#666]">Redirecting to Event · Partners…</p>
    </div>
  );
}
