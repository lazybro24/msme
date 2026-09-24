import Link from "next/link";

export function PageSectionNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <nav
      aria-label="On this page"
      className="page-awards-bg sticky top-16 z-30 border-b border-black/10 sm:top-[4.25rem]"
    >
      <div className="container-page flex gap-1 overflow-x-auto py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#555] hover:text-black"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
