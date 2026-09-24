"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { LOGO_INTRO_KEY, LOGO_SRC } from "@/lib/logo";

const APPEAR_MS = 600;
const HOLD_MS = 2000; // stay full-page for 2 seconds
const ANIMATE_MS = 700; // morph / fade into navbar

/**
 * On first open in a tab session:
 * 1) Full-page logo appears
 * 2) Holds for 2 seconds
 * 3) Then animates into the navbar
 */
export function LogoIntro({ onComplete }: { onComplete: () => void }) {
  const reduceMotion = useReducedMotion();
  const [overlay, setOverlay] = useState(true);
  const [handedOff, setHandedOff] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      try {
        sessionStorage.setItem(LOGO_INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
      onComplete();
      setOverlay(false);
      return;
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Appear → hold 2s → hand off to navbar (layout animation) → hide overlay
    const handoffAt = APPEAR_MS + HOLD_MS;
    const hideAt = handoffAt + ANIMATE_MS;

    const handoff = window.setTimeout(() => {
      setHandedOff(true);
      onComplete();
      try {
        sessionStorage.setItem(LOGO_INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
    }, handoffAt);

    const hide = window.setTimeout(() => {
      setOverlay(false);
    }, hideAt);

    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(handoff);
      window.clearTimeout(hide);
    };
  }, [reduceMotion, onComplete]);

  return (
    <AnimatePresence>
      {overlay && (
        <motion.div
          key="logo-intro"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          animate={{ opacity: handedOff ? 0 : 1 }}
          transition={{ duration: ANIMATE_MS / 1000, ease: "easeInOut" }}
          aria-hidden
        >
          {!handedOff && (
            <motion.img
              layoutId="msme-brand-logo"
              src={LOGO_SRC}
              alt=""
              className="h-[min(92vh,92vw)] w-[min(92vh,92vw)] max-h-[92vh] max-w-[92vw] object-contain"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                layout: { type: "spring", stiffness: 110, damping: 20 },
                opacity: { duration: APPEAR_MS / 1000 },
                scale: { duration: APPEAR_MS / 1000, ease: [0.22, 1, 0.36, 1] },
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
