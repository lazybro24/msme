"use client";

import { useEffect } from "react";

/**
 * Nested-safe body scroll lock (ref-counted).
 * Multiple overlays/modals can lock at once; scroll restores only when the last one unlocks.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyles: {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  bodyTouch: string;
} | null = null;

function blockScroll(e: Event) {
  e.preventDefault();
}

function applyLock() {
  const html = document.documentElement;
  const body = document.body;
  savedScrollY = window.scrollY;
  savedStyles = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
    bodyTouch: body.style.touchAction,
  };
  const scrollbar = Math.max(0, window.innerWidth - html.clientWidth);
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${savedScrollY}px`;
  body.style.width = "100%";
  body.style.touchAction = "none";
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  window.addEventListener("wheel", blockScroll, { passive: false });
  window.addEventListener("touchmove", blockScroll, { passive: false });
}

function releaseLock() {
  const html = document.documentElement;
  const body = document.body;
  if (savedStyles) {
    html.style.overflow = savedStyles.htmlOverflow;
    body.style.overflow = savedStyles.bodyOverflow;
    body.style.position = savedStyles.bodyPosition;
    body.style.top = savedStyles.bodyTop;
    body.style.width = savedStyles.bodyWidth;
    body.style.paddingRight = savedStyles.bodyPaddingRight;
    body.style.touchAction = savedStyles.bodyTouch;
    savedStyles = null;
  } else {
    html.style.overflow = "";
    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.width = "";
    body.style.paddingRight = "";
    body.style.touchAction = "";
  }
  window.removeEventListener("wheel", blockScroll);
  window.removeEventListener("touchmove", blockScroll);
  window.scrollTo(0, savedScrollY);
}

/** Lock page scroll while a modal / full-screen loader is open. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) applyLock();
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseLock();
    };
  }, [locked]);
}
