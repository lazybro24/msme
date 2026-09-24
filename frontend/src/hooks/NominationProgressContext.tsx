"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useNominationProgress, type NominationProgress } from "@/hooks/useNominationProgress";

const NominationProgressContext = createContext<NominationProgress | null>(null);

export function NominationProgressProvider({ children }: { children: ReactNode }) {
  const value = useNominationProgress();
  return (
    <NominationProgressContext.Provider value={value}>{children}</NominationProgressContext.Provider>
  );
}

export function useSharedNominationProgress(): NominationProgress {
  const ctx = useContext(NominationProgressContext);
  if (!ctx) {
    throw new Error("useSharedNominationProgress must be used within NominationProgressProvider");
  }
  return ctx;
}
