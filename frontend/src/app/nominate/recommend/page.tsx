"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Find Award moved into Categories — redirect old bookmarks */
export default function RecommendAwardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/nominate/categories");
  }, [router]);
  return (
    <div className="page-awards-bg page-awards-bg--cream min-h-[40vh]">
      <p className="container-page py-20 text-sm text-[#666]">
        Redirecting to Categories · Find What Fits You…
      </p>
    </div>
  );
}
