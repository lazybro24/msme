"use client";

import { useEffect } from "react";

/** Legacy route → merged About page (Integrity section) */
export default function IntegrityRedirect() {
  useEffect(() => {
    window.location.replace("/about#integrity");
  }, []);
  return (
    <div className="page-awards-bg min-h-[40vh]">
      <p className="container-page py-20 text-sm text-[#666]">Redirecting to About · Integrity…</p>
    </div>
  );
}
