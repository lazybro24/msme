"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/api";

type GuardApi = {
  getDirty: () => boolean;
  onSave: () => Promise<void> | void;
};

type UnsavedProcessContextValue = {
  register: (api: GuardApi) => void;
  unregister: () => void;
  /** Skip the next navigation prompt (after intentional save & continue). */
  allowNextNavigation: () => void;
  /** Returns true if leave was deferred (dialog shown). */
  requestLeave: (href: string) => boolean;
};

const UnsavedProcessContext = createContext<UnsavedProcessContextValue | null>(null);

function normalizePath(href: string) {
  try {
    if (href.startsWith("http")) {
      return new URL(href).pathname;
    }
  } catch {
    /* ignore */
  }
  return href.split("?")[0].split("#")[0];
}

function isSameDestination(href: string, pathname: string) {
  const path = normalizePath(href);
  if (path === pathname) return true;
  if (path === "/nominate/applications" && pathname.startsWith("/nominate/applications/")) {
    return true;
  }
  return false;
}

export function UnsavedProcessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const apiRef = useRef<GuardApi | null>(null);
  const bypassRef = useRef(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const register = useCallback((api: GuardApi) => {
    apiRef.current = api;
  }, []);

  const unregister = useCallback(() => {
    apiRef.current = null;
  }, []);

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  const isDirty = () => Boolean(apiRef.current?.getDirty());

  const requestLeave = useCallback(
    (href: string) => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return false;
      }
      if (!isDirty()) return false;
      if (href !== "__logout__" && isSameDestination(href, pathname)) return false;
      setPendingHref(href === "__logout__" ? "__logout__" : normalizePath(href) || href);
      return true;
    },
    [pathname],
  );

  function go(href: string) {
    bypassRef.current = true;
    setPendingHref(null);
    if (href === "__logout__") {
      clearSession();
      window.location.href = "/nominate/login";
      return;
    }
    router.push(href);
  }

  async function saveAndGo() {
    const api = apiRef.current;
    const href = pendingHref;
    if (!href) return;
    setSaving(true);
    try {
      if (api) await api.onSave();
      go(href);
    } catch {
      /* keep dialog open on save failure */
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }
      if (!isDirty()) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const el = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!el) return;
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (/^https?:\/\//i.test(href) && !href.includes(window.location.host)) {
        return;
      }
      if (isSameDestination(href, pathname)) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(normalizePath(href) || href);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <UnsavedProcessContext.Provider
      value={{ register, unregister, allowNextNavigation, requestLeave }}
    >
      {children}
      {pendingHref && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-[#1a1814]/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => !saving && setPendingHref(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md border border-[#e8a914]/35 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(26,24,20,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-1 w-full bg-gradient-to-r from-[#1a1814] via-[#e8a914] to-[#f5d56a]"
              aria-hidden
            />
            <h2 className="mt-4 font-display text-xl font-black italic uppercase text-[#1a1814]">
              Save progress till here?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#444]">
              You still have unfinished work on this page. Save the process till done here before
              going to another page, or exit without saving.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => go(pendingHref)}
              >
                Exit without saving
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void saveAndGo()}
              >
                {saving ? "Saving…" : "Save progress till here"}
              </button>
            </div>
            <button
              type="button"
              className="btn-ghost mt-3 w-full !text-xs"
              disabled={saving}
              onClick={() => setPendingHref(null)}
            >
              Stay on this page
            </button>
          </div>
        </div>
      )}
    </UnsavedProcessContext.Provider>
  );
}

export function useUnsavedProcessOptional() {
  return useContext(UnsavedProcessContext);
}

/** Register dirty state + save handler for leave-page prompts. */
export function useUnsavedProcessGuard(opts: {
  dirty: boolean;
  onSave: () => Promise<void> | void;
}) {
  const ctx = useContext(UnsavedProcessContext);
  const dirtyRef = useRef(opts.dirty);
  const saveRef = useRef(opts.onSave);
  dirtyRef.current = opts.dirty;
  saveRef.current = opts.onSave;

  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      getDirty: () => dirtyRef.current,
      onSave: () => saveRef.current(),
    });
    return () => ctx.unregister();
  }, [ctx]);

  return {
    allowNextNavigation: ctx?.allowNextNavigation ?? (() => undefined),
  };
}
