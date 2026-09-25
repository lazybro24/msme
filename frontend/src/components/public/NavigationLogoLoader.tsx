"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mainNav } from "@/content/site";
import { LOGO_SRC } from "@/lib/logo";

const MIN_VISIBLE_MS = 1400;

/** Only the primary public header links (Home → Contact). */
const MAIN_NAV_PATHS = new Set<string>(mainNav.map((item) => item.href));

function isMainNavPath(pathname: string) {
  if (MAIN_NAV_PATHS.has(pathname)) return true;
  // Awards category detail pages count as Awards browsing
  if (pathname.startsWith("/awards/")) return true;
  return false;
}

/**
 * Full-page logo overlay only while redirecting between primary public nav pages.
 * Never on login, register, portals, or other routes.
 */
export function NavigationLogoLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const shownAt = useRef(0);
  const hideTimer = useRef<number | null>(null);
  const prevPath = useRef(pathname);
  const routeKey = `${pathname}?${searchParams?.toString() ?? ""}`;

  function clearHideTimer() {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function scheduleHide(fromRouteChange = false) {
    clearHideTimer();
    const elapsed = Date.now() - shownAt.current;
    const wait = fromRouteChange
      ? Math.max(0, MIN_VISIBLE_MS - elapsed)
      : MIN_VISIBLE_MS;
    hideTimer.current = window.setTimeout(() => {
      setActive(false);
      hideTimer.current = null;
    }, wait);
  }

  function showLoader() {
    clearHideTimer();
    shownAt.current = Date.now();
    setActive(true);
    scheduleHide(false);
  }

  useEffect(() => {
    if (!active) {
      prevPath.current = pathname;
      return;
    }
    scheduleHide(true);
    prevPath.current = pathname;
    return clearHideTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    function isMainNavRedirect(fromPath: string, toPath: string) {
      if (fromPath === toPath) return false;
      return isMainNavPath(fromPath) && isMainNavPath(toPath);
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const fromPath = window.location.pathname;
      const toPath = url.pathname;
      if (!isMainNavRedirect(fromPath, toPath)) return;

      showLoader();
    }

    function onPopState() {
      const toPath = window.location.pathname;
      const fromPath = prevPath.current;
      if (!isMainNavRedirect(fromPath, toPath)) return;
      showLoader();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearHideTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fade = reduceMotion ? 0 : 0.45;

  return (
    <AnimatePresence mode="sync">
      {active && (
        <motion.div
          key="nav-logo-loader"
          className="fixed inset-0 z-[280] flex items-center justify-center bg-white/55 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fade, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt=""
            className="h-[min(90vh,90vw)] w-[min(90vh,90vw)] max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
            style={{ opacity: 1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
