"use client";

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

/** Full-screen busy overlay while saving / uploading to the API. */
export function ProcessOverlay({
  open,
  title = "Saving…",
  message = "Please wait while we save this to the database.",
}: {
  open: boolean;
  title?: string;
  message?: string;
}) {
  useBodyScrollLock(open);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-[#1a1814]/50 p-4 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm border border-[#e8a914]/35 bg-white p-6 text-center shadow-[0_24px_60px_-20px_rgba(26,24,20,0.55)]">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#e8a914] border-t-transparent"
          aria-hidden
        />
        <p className="mt-4 font-display text-lg font-black italic uppercase text-[#1a1814]">
          {title}
        </p>
        <p className="mt-2 text-sm text-[#555]">{message}</p>
      </div>
    </div>
  );
}
