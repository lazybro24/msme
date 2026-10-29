import type { Metadata } from "next";
import { PageProcessProvider } from "@/hooks/PageProcessContext";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function NominateLayout({ children }: { children: React.ReactNode }) {
  return <PageProcessProvider>{children}</PageProcessProvider>;
}
