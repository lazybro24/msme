import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f4f2] px-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold-dark)]">
        Mysuru MSME Awards 2026
      </p>
      <h1 className="mt-3 font-display text-4xl font-black italic uppercase">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-[#666]">
        The page you requested does not exist or has been moved.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
