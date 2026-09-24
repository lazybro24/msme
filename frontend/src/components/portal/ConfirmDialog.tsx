"use client";

import { useCallback, useEffect, useState } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type Pending = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const dialog = pending ? (
    <ConfirmDialog
      title={pending.title ?? "Please confirm"}
      message={pending.message}
      confirmLabel={pending.confirmLabel ?? "OK"}
      cancelLabel={pending.cancelLabel ?? "Cancel"}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, dialog };
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-[#1a1814]/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md border border-[#e8a914]/35 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(26,24,20,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#1a1814] via-[#e8a914] to-[#f5d56a]" aria-hidden />
        <h2
          id="confirm-dialog-title"
          className="mt-4 font-display text-xl font-black italic uppercase text-[#1a1814]"
        >
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-3 text-sm leading-relaxed text-[#444]">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
