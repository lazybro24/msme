"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastApi = {
  push: (input: { title: string; description?: string; tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (input: { title: string; description?: string; tone?: ToastTone }) => {
        if (typeof window !== "undefined") {
          window.alert([input.title, input.description].filter(Boolean).join("\n"));
        }
      },
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const reduce = useReducedMotion();

  const push = useCallback((input: { title: string; description?: string; tone?: ToastTone }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      tone: input.tone ?? "info",
    };
    setItems((prev) => [...prev.slice(-3), item]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={reduce ? false : { opacity: 0, y: 16, x: 8 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "pointer-events-auto overflow-hidden border bg-white shadow-soft",
                t.tone === "success" && "border-[var(--brand-gold)]/40",
                t.tone === "error" && "border-red-300",
                t.tone === "info" && "border-[var(--line)]",
              )}
              role="status"
            >
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-[var(--ink)]">{t.title}</p>
                {t.description && <p className="mt-1 text-xs text-[var(--muted)]">{t.description}</p>}
              </div>
              <motion.div
                className={cn(
                  "h-0.5 origin-left",
                  t.tone === "error" ? "bg-red-500" : "bg-[var(--brand-gold)]",
                )}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: reduce ? 0 : 4.2, ease: "linear" }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
