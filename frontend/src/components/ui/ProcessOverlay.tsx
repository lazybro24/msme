"use client";

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

/** Full-screen busy overlay — spinner only (no text). */
export function ProcessOverlay({ open }: { open: boolean; title?: string; message?: string }) {
  useBodyScrollLock(open);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1a1814]/55 backdrop-blur-[2px]"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Saving"
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#e8a914] border-t-transparent"
        aria-hidden
      />
    </div>
  );
}
