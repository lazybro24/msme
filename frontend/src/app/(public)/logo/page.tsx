"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LOGO_SRC } from "@/lib/logo";

/** Full-bleed logo only — no captions, no chrome. Click to return home. */
export default function LogoPage() {
  return (
    <Link
      href="/"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
      aria-label="Close logo view"
    >
      <motion.img
        layoutId="msme-brand-logo"
        src={LOGO_SRC}
        alt=""
        className="h-[min(96vh,96vw)] w-[min(96vh,96vw)] max-h-[96vh] max-w-[96vw] object-contain"
        transition={{ type: "spring", stiffness: 140, damping: 24 }}
      />
    </Link>
  );
}
