"use client";

import { useEffect } from "react";

/** Mark empty required controls with a red border. Returns count of incomplete. */
export function markIncompleteFields(root: HTMLElement | null): number {
  if (!root) return 0;
  root.querySelectorAll<HTMLElement>("[data-incomplete]").forEach((el) => {
    el.removeAttribute("data-incomplete");
    el.classList.remove("input-error", "!border-red-500", "ring-1", "ring-red-400");
  });

  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input[required], textarea[required], select[required]",
  );
  let count = 0;
  fields.forEach((el) => {
    if (el.type === "checkbox" || el.type === "radio") {
      if (el instanceof HTMLInputElement && el.type === "checkbox" && !el.checked) {
        count += 1;
        el.setAttribute("data-incomplete", "1");
        el.classList.add("ring-1", "ring-red-400");
      }
      return;
    }
    if (!String(el.value || "").trim()) {
      count += 1;
      el.setAttribute("data-incomplete", "1");
      el.classList.add("input-error", "!border-red-500");
    }
  });
  return count;
}

export function clearIncompleteMarks(root: HTMLElement | null) {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("[data-incomplete]").forEach((el) => {
    el.removeAttribute("data-incomplete");
    el.classList.remove("input-error", "!border-red-500", "ring-1", "ring-red-400");
  });
}

export function IncompleteGateDialog({
  open,
  missingCount,
  onStay,
  onContinueAnyway,
  allowSkip = false,
  title = "Required fields incomplete",
  message,
}: {
  open: boolean;
  missingCount?: number;
  onStay: () => void;
  onContinueAnyway?: () => void;
  /** When false (default), user cannot proceed until required fields are filled. */
  allowSkip?: boolean;
  title?: string;
  message?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#1a1814]/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onStay}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-md border border-red-300 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(26,24,20,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-red-700 via-[#e8a914] to-[#f5d56a]" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-black italic uppercase text-[#1a1814]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#444]">
          {message ||
            (missingCount
              ? `${missingCount} mandatory field${missingCount === 1 ? "" : "s"} marked with * ${missingCount === 1 ? "is" : "are"} still empty. Please complete ${missingCount === 1 ? "it" : "them"} before continuing. Incomplete fields are highlighted in red.`
              : "Mandatory fields marked with * are still empty. Please complete them before continuing. Incomplete fields are highlighted in red.")}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {allowSkip && onContinueAnyway ? (
            <>
              <button type="button" className="btn-secondary" onClick={onStay}>
                Stay & complete
              </button>
              <button type="button" className="btn-primary" onClick={onContinueAnyway}>
                Continue without completing
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={onStay} autoFocus>
              OK, I will complete them
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
