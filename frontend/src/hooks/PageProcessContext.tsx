"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ProcessOverlay } from "@/components/ui/ProcessOverlay";

type PageProcessContextValue = {
  /** Show the full-page loader (e.g. while saving). */
  begin: (message?: string) => void;
  /** Hide the loader unless a navigation is in flight. */
  end: () => void;
  /** Keep loader up and push/replace to the next route. */
  navigate: (href: string, message?: string, opts?: { replace?: boolean }) => void;
  /** Run save work, then navigate with the loader covering both phases. */
  runAndNavigate: (
    work: () => Promise<void>,
    href: string,
    messages?: { saving?: string; next?: string },
  ) => Promise<void>;
  open: boolean;
};

const PageProcessContext = createContext<PageProcessContextValue | null>(null);

function pathOnly(href: string) {
  return href.split("?")[0].split("#")[0];
}

export function PageProcessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("Saving…");
  const navTargetRef = useRef<string | null>(null);
  const hideTimerRef = useRef<number>(0);

  useEffect(() => {
    if (!navTargetRef.current) return;
    const target = pathOnly(navTargetRef.current);
    if (pathname !== target && !pathname.startsWith(`${target}/`)) return;
    navTargetRef.current = null;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setOpen(false), 280);
    return () => window.clearTimeout(hideTimerRef.current);
  }, [pathname]);

  const begin = useCallback((msg?: string) => {
    window.clearTimeout(hideTimerRef.current);
    setMessage(msg || "Saving…");
    setOpen(true);
  }, []);

  const end = useCallback(() => {
    if (navTargetRef.current) return;
    setOpen(false);
  }, []);

  const navigate = useCallback(
    (href: string, msg?: string, opts?: { replace?: boolean }) => {
      window.clearTimeout(hideTimerRef.current);
      setMessage(msg || "Loading next step…");
      setOpen(true);
      navTargetRef.current = href;
      if (opts?.replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );

  const runAndNavigate = useCallback(
    async (
      work: () => Promise<void>,
      href: string,
      messages?: { saving?: string; next?: string },
    ) => {
      begin(messages?.saving || "Saving…");
      try {
        await work();
        setMessage(messages?.next || "Loading next step…");
        navTargetRef.current = href;
        router.push(href);
      } catch (err) {
        navTargetRef.current = null;
        setOpen(false);
        throw err;
      }
    },
    [begin, router],
  );

  const value = useMemo(
    () => ({ begin, end, navigate, runAndNavigate, open }),
    [begin, end, navigate, runAndNavigate, open],
  );

  return (
    <PageProcessContext.Provider value={value}>
      {children}
      <ProcessOverlay open={open} message={message} />
    </PageProcessContext.Provider>
  );
}

export function usePageProcess() {
  const ctx = useContext(PageProcessContext);
  if (!ctx) {
    throw new Error("usePageProcess must be used within PageProcessProvider");
  }
  return ctx;
}

export function usePageProcessOptional() {
  return useContext(PageProcessContext);
}
