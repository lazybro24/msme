"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { LayoutGroup } from "framer-motion";
import { NavigationLogoLoader } from "@/components/public/NavigationLogoLoader";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { PublicMain } from "@/components/public/PublicMain";
import { PageTransition } from "@/components/motion/PageTransition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

/**
 * Shared chrome for every public page: header on all routes except full-bleed /logo.
 * Full-page logo overlay only during in-app page redirects.
 */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogoPage = pathname === "/logo";

  if (isLogoPage) {
    return <LayoutGroup id="msme-logo">{children}</LayoutGroup>;
  }

  return (
    <LayoutGroup id="msme-logo">
      <Suspense fallback={null}>
        <NavigationLogoLoader />
      </Suspense>
      <SiteHeader logoInNav />
      <SmoothScroll>
        <PublicMain>
          <PageTransition>{children}</PageTransition>
        </PublicMain>
        <SiteFooter />
      </SmoothScroll>
    </LayoutGroup>
  );
}
