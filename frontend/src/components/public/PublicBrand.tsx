"use client";

import { useCallback, useState } from "react";
import { LogoIntro } from "@/components/public/LogoIntro";
import { SiteHeader } from "@/components/public/SiteHeader";

/** @deprecated Prefer PublicChrome — kept for compatibility. */
export function PublicBrand() {
  const [logoInNav, setLogoInNav] = useState(false);

  const onIntroComplete = useCallback(() => {
    setLogoInNav(true);
  }, []);

  return (
    <>
      <LogoIntro onComplete={onIntroComplete} />
      <SiteHeader logoInNav={logoInNav} />
    </>
  );
}
