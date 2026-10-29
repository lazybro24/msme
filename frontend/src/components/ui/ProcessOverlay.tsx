"use client";

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

/** Full-screen busy overlay — spinner with optional status text. */
export function ProcessOverlay({
  open,
  title,
  message,
}: {
  open: boolean;
  title?: string;
  message?: string;
}) {
  useBodyScrollLock(open);
  if (!open) return null;

  const status = message || title || "Saving…";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#1a1814]/6 backdrop-blur-[3px]"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={status}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div
          className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#e8a914] border-t-transparent"
          aria-hidden
        />
        <p className="max-w-xs text-[11px] font-bold uppercase tracking-[0.16em] text-white/90">
          {status}
        </p>
      </div>
    </div>
  );
}
