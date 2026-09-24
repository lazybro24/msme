"use client";

import { useEffect } from "react";

/** Legacy route → merged Contact page (FAQ section) */
export default function FaqRedirect() {
  useEffect(() => {
    window.location.replace("/contact#faq");
  }, []);
  return (
    <div className="page-awards-bg min-h-[40vh]">
      <p className="container-page py-20 text-sm text-[#666]">Redirecting to Contact · FAQ…</p>
    </div>
  );
}
