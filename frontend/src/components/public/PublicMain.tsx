"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Pads content under the fixed site header on every public page. */
export function PublicMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <main className={cn("relative z-[1]", !isHome && "pt-16 sm:pt-[4.5rem]")}>
      {children}
    </main>
  );
}
