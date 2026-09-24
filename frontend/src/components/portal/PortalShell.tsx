"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { apiGet, clearSession, getStoredUser, getToken, setSession, type AuthUser } from "@/lib/api";
import { authFileUrl } from "@/lib/files";
import { cn } from "@/lib/utils";
import { NominationProgressProvider, useSharedNominationProgress } from "@/hooks/NominationProgressContext";
import { UnsavedProcessProvider, useUnsavedProcessOptional } from "@/hooks/UnsavedProcessContext";
import { ADMIN_BASE, adminHref } from "@/lib/adminPath";

function userPhotoSrc(url?: string | null) {
  return authFileUrl(url);
}

/** Workflow steps + utility links (Messages / Help). */
export const applicantNav = [
  { href: "/nominate/dashboard", label: "1. Account" },
  { href: "/nominate/profile", label: "2. Details" },
  { href: "/nominate/categories", label: "3. Category" },
  { href: "/nominate/documents", label: "4. Documents" },
  { href: "/nominate/applications", label: "5. Review & Submit" },
  { href: "/nominate/messages", label: "Messages" },
  { href: "/nominate/help", label: "Help" },
] as const;

/** Admin console — obscure URL; not linked from public UI. */
export const secretariatNav = [
  { href: ADMIN_BASE, label: "Dashboard" },
  { href: adminHref("/users"), label: "Users" },
  { href: adminHref("/inbox"), label: "Inbox" },
  { href: adminHref("/applications"), label: "Applications" },
  { href: adminHref("/jury-profiles"), label: "Jury Profiles" },
  { href: adminHref("/assignments"), label: "Jury Assignment" },
  { href: adminHref("/moderation"), label: "Moderation" },
  { href: adminHref("/audit"), label: "Audit Log" },
] as const;

export const juryNav = [
  { href: "/jury-portal", label: "My Evaluations" },
  { href: "/jury-portal/profile", label: "My Profile" },
  { href: "/jury-portal/contact", label: "Contact" },
  { href: "/jury-portal/conduct", label: "Code of Conduct" },
] as const;

export const observerNav = [
  { href: "/observer", label: "Process Observer" },
] as const;

/** Highlight only the most specific matching nav item (avoids parent roots lighting up siblings). */
function isNavActive(pathname: string, href: string, navHrefs: readonly string[]) {
  const matches =
    pathname === href || pathname.startsWith(`${href}/`);
  if (!matches) return false;
  return !navHrefs.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      (other === href || other.startsWith(`${href}/`)) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
}

/** Applicant top nav — workflow steps gated in order; Messages / Finalist / Help always open. */
function ApplicantNavLinks({
  nav,
  pathname,
  navHrefs,
  activeClass,
  idleClass,
  lockedClass,
  itemClassName,
  onNavigate,
}: {
  nav: readonly { href: string; label: string }[] | { href: string; label: string }[];
  pathname: string;
  navHrefs: readonly string[];
  activeClass: string;
  idleClass: string;
  lockedClass: string;
  itemClassName: string;
  onNavigate?: () => void;
}) {
  const { canAccess, reviewHref } = useSharedNominationProgress();

  const stepHrefByLabel: Record<string, string> = {
    "1. Account": "/nominate/dashboard",
    "2. Details": "/nominate/profile",
    "3. Category": "/nominate/categories",
    "4. Documents": "/nominate/documents",
    "5. Review & Submit": reviewHref,
  };

  const utilityLabels = new Set(["Messages", "Finalist Profile", "Help"]);

  return (
    <>
      {nav.map((item) => {
        const href = stepHrefByLabel[item.label] ?? item.href;
        const isUtility = utilityLabels.has(item.label);
        const allowed =
          item.label === "5. Review & Submit"
            ? canAccess("/nominate/applications")
            : canAccess(href);
        const active =
          item.label === "5. Review & Submit"
            ? pathname.startsWith("/nominate/applications")
            : isNavActive(pathname, href, navHrefs);

        const utilityBorder = "border border-[#e8a914]/55";
        const utilityIdle = cn(utilityBorder, "text-white/80 hover:bg-white/10 hover:text-white");
        const utilityActive = cn(
          "border border-[#e8a914] bg-[#e8a914] text-[#1a0c10]",
        );

        if (!allowed) {
          return (
            <span
              key={item.label}
              title="Complete earlier steps first"
              className={cn(itemClassName, lockedClass, isUtility && utilityBorder)}
            >
              {item.label}
            </span>
          );
        }
        return (
          <Link
            key={item.label}
            href={href}
            onClick={onNavigate}
            className={cn(
              itemClassName,
              isUtility
                ? active
                  ? utilityActive
                  : utilityIdle
                : active
                  ? activeClass
                  : idleClass,
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

type PortalVariant = "applicant" | "secretariat" | "jury" | "observer";

function detectVariant(pathname: string): PortalVariant {
  if (pathname.startsWith(ADMIN_BASE) || pathname.startsWith("/secretariat")) return "secretariat";
  if (pathname.startsWith("/jury-portal")) return "jury";
  if (pathname.startsWith("/observer")) return "observer";
  return "applicant";
}

const themes: Record<
  PortalVariant,
  {
    pageBg: string;
    header: string;
    accentBar: string;
    brandMark: string;
    brandTitle: string;
    subtitle: string;
    userChip: string;
    linkMuted: string;
    menuBtn: string;
    navBar: string;
    navActive: string;
    navIdle: string;
    drawer: string;
    drawerActive: string;
    badge: string;
  }
> = {
  applicant: {
    pageBg: "bg-[#f7f4f2]",
    header: "border-b border-[#e8a914]/35 bg-gradient-to-br from-[#2a1018] via-[#1a0a0e] to-[#0d0507]",
    accentBar: "bg-gradient-to-r from-[#e8a914] via-[#f5d56a] to-[#e8a914]",
    brandMark: "text-[#e8a914]",
    brandTitle: "text-white",
    subtitle: "text-white/70",
    userChip:
      "border border-[#e8a914]/40 bg-[#e8a914]/15 text-[#f5d56a]",
    linkMuted: "text-white/85 hover:text-[#e8a914]",
    menuBtn: "border-[#e8a914]/40 text-white hover:bg-[#e8a914]/15",
    navBar: "border-t border-white/10 bg-black/25",
    navActive: "bg-[#e8a914] text-[#1a0c10] shadow-[0_0_0_1px_rgba(232,169,20,0.4)]",
    navIdle: "text-white/75 hover:bg-white/10 hover:text-white",
    drawer: "bg-[#1a0a0e]",
    drawerActive: "bg-[#e8a914] text-[#1a0c10]",
    badge: "Applicant",
  },
  secretariat: {
    pageBg: "bg-[#eef2f7]",
    header: "border-b border-[#3b82f6]/30 bg-gradient-to-br from-[#0b1c33] via-[#102a4a] to-[#0a1628]",
    accentBar: "bg-gradient-to-r from-[#38bdf8] via-[#3b82f6] to-[#1d4ed8]",
    brandMark: "text-[#7dd3fc]",
    brandTitle: "text-white",
    subtitle: "text-sky-100/70",
    userChip: "border border-sky-400/40 bg-sky-500/15 text-sky-200",
    linkMuted: "text-sky-100/85 hover:text-sky-200",
    menuBtn: "border-sky-400/40 text-white hover:bg-sky-500/15",
    navBar: "border-t border-white/10 bg-[#07111f]/55",
    navActive: "bg-[#38bdf8] text-[#0b1c33]",
    navIdle: "text-sky-100/70 hover:bg-white/10 hover:text-white",
    drawer: "bg-[#0b1c33]",
    drawerActive: "bg-[#38bdf8] text-[#0b1c33]",
    badge: "Admin",
  },
  jury: {
    pageBg: "bg-[#f8f5ef]",
    header:
      "border-b border-[#e8a914]/40 bg-gradient-to-br from-[#1c1916] via-[#2a241c] to-[#141210]",
    accentBar: "bg-gradient-to-r from-[#c4890c] via-[#e8a914] to-[#f5d56a]",
    brandMark: "text-[#f5d56a]",
    brandTitle: "text-white",
    subtitle: "text-[#f5d56a]/75",
    userChip: "border border-[#e8a914]/45 bg-[#e8a914]/15 text-[#f5d56a]",
    linkMuted: "text-white/85 hover:text-[#f5d56a]",
    menuBtn: "border-[#e8a914]/45 text-white hover:bg-[#e8a914]/15",
    navBar: "border-t border-[#e8a914]/20 bg-[#0f0d0b]/45",
    navActive: "bg-[#e8a914] text-[#1a1814] shadow-[0_0_0_1px_rgba(232,169,20,0.45)]",
    navIdle: "text-[#f5d56a]/70 hover:bg-white/10 hover:text-white",
    drawer: "bg-[#1c1916]",
    drawerActive: "bg-[#e8a914] text-[#1a1814]",
    badge: "Jury",
  },
  observer: {
    pageBg: "bg-[#f3f1ef]",
    header: "border-b border-orange-400/25 bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#0c0a09]",
    accentBar: "bg-gradient-to-r from-[#fb923c] via-[#f59e0b] to-[#ea580c]",
    brandMark: "text-[#fdba74]",
    brandTitle: "text-white",
    subtitle: "text-orange-100/65",
    userChip: "border border-orange-400/35 bg-orange-500/15 text-orange-200",
    linkMuted: "text-orange-50/85 hover:text-[#fdba74]",
    menuBtn: "border-orange-400/35 text-white hover:bg-orange-500/15",
    navBar: "border-t border-white/10 bg-black/30",
    navActive: "bg-[#fb923c] text-[#1c1917]",
    navIdle: "text-stone-200/75 hover:bg-white/10 hover:text-white",
    drawer: "bg-[#1c1917]",
    drawerActive: "bg-[#fb923c] text-[#1c1917]",
    badge: "Observer",
  },
};

export function PortalShell({
  brand,
  subtitle,
  nav,
  children,
  userLabel,
}: {
  brand: string;
  subtitle: string;
  nav: readonly { href: string; label: string }[] | { href: string; label: string }[];
  children: React.ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();
  const variant = detectVariant(pathname);
  const isApplicantFlow =
    variant === "applicant" &&
    !pathname.includes("/login") &&
    !pathname.includes("/register");

  const body = (
    <PortalShellBody
      brand={brand}
      subtitle={subtitle}
      nav={nav}
      userLabel={userLabel}
    >
      {children}
    </PortalShellBody>
  );

  if (isApplicantFlow) {
    return <UnsavedProcessProvider>{body}</UnsavedProcessProvider>;
  }
  return body;
}

function PortalShellBody({
  brand,
  subtitle,
  nav,
  children,
  userLabel,
}: {
  brand: string;
  subtitle: string;
  nav: readonly { href: string; label: string }[] | { href: string; label: string }[];
  children: React.ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const variant = detectVariant(pathname);
  const t = themes[variant];
  const [open, setOpen] = useState(false);
  const [headerUser, setHeaderUser] = useState<AuthUser | null>(null);
  const navHrefs = nav.map((n) => n.href);

  const loginPath =
    variant === "secretariat"
      ? adminHref("/login")
      : variant === "jury"
        ? "/jury-portal/login"
        : variant === "observer"
          ? "/observer/login"
          : "/nominate/login";

  const unsaved = useUnsavedProcessOptional();

  function handleLogout() {
    if (unsaved?.requestLeave("__logout__")) return;
    clearSession();
    router.push(loginPath);
  }

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (variant !== "jury") {
      setHeaderUser(null);
      return;
    }
    setHeaderUser(getStoredUser());
    apiGet<{ user: AuthUser }>("/api/auth/me")
      .then((d) => {
        setHeaderUser(d.user);
        const token = getToken();
        if (token) setSession(token, d.user);
      })
      .catch(() => {
        /* keep stored user */
      });
  }, [variant, pathname]);

  return (
    <div className={cn("portal-page relative isolate min-h-screen", t.pageBg)}>
      {/* Desktop / tablet header */}
      <header className={cn("hidden text-white min-[480px]:block", t.header)}>
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 px-4 py-3 sm:items-center sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.16em] sm:text-xs",
                  t.brandMark,
                )}
              >
                Mysuru MSME Awards 2026
              </Link>
              <span
                className={cn(
                  "rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
                  t.userChip,
                )}
              >
                {t.badge}
              </span>
            </div>
            <div
              className={cn(
                "mt-1 font-display text-lg font-black italic uppercase leading-tight tracking-tight sm:text-xl",
                t.brandTitle,
              )}
            >
              {brand}
            </div>
            <div className={cn("text-xs leading-snug", t.subtitle)}>{subtitle}</div>
          </div>

          <div className="flex shrink-0 items-start gap-2 sm:gap-3">
            <div className="flex items-stretch gap-2">
              {variant === "jury" && (
                <Link
                  href="/jury-portal/profile"
                  className={cn(
                    "flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden border transition hover:opacity-90",
                    t.menuBtn,
                  )}
                  title="My Profile"
                >
                  {headerUser?.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userPhotoSrc(headerUser.photoUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-xl font-black italic text-white/90">
                      {(headerUser?.fullName || userLabel).slice(0, 1)}
                    </span>
                  )}
                </Link>
              )}
              <div className="flex min-w-0 max-w-[14rem] flex-col items-stretch gap-1.5 sm:max-w-[18rem]">
                {variant === "jury" ? (
                  <Link
                    href="/jury-portal/profile"
                    className={cn(
                      "w-full px-2.5 py-1.5 text-[10px] font-bold uppercase leading-snug tracking-[0.08em] transition hover:opacity-90",
                      t.userChip,
                    )}
                    title="My Profile"
                  >
                    <span className="break-words">{userLabel}</span>
                  </Link>
                ) : (
                  <div
                    className={cn(
                      "w-full px-2.5 py-1.5 text-[10px] font-bold uppercase leading-snug tracking-[0.08em]",
                      t.userChip,
                    )}
                  >
                    <span className="break-words">{userLabel}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 border px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] transition",
                    t.menuBtn,
                  )}
                >
                  <LogOut size={14} aria-hidden />
                  Logout
                </button>
              </div>
            </div>

            {variant !== "jury" && (
              <Link
                href="/contact"
                className={cn(
                  "inline-flex min-h-[4.75rem] min-w-[5.5rem] flex-col items-center justify-center gap-2 border px-3.5 text-[10px] font-bold uppercase tracking-[0.1em] transition",
                  t.menuBtn,
                )}
                title="Contact now"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H9l-4 3.5V6.5z"
                  />
                  <path strokeLinecap="round" d="M8 9h8M8 12h5" />
                </svg>
                <span className="leading-tight">Contact Now</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-40">
        {variant === "applicant" &&
        !pathname.includes("/login") &&
        !pathname.includes("/register") ? (
          <NominationProgressProvider>
            <nav className={cn("hidden min-[480px]:block", t.header, t.navBar)}>
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-1 px-4 py-2 sm:px-6">
                <ApplicantNavLinks
                  nav={nav}
                  pathname={pathname}
                  navHrefs={navHrefs}
                  activeClass={t.navActive}
                  idleClass={t.navIdle}
                  lockedClass="cursor-not-allowed text-white/35"
                  itemClassName="whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition"
                />
              </div>
            </nav>

            <header className={cn("text-white min-[480px]:hidden", t.header)}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center border",
                    t.menuBtn,
                  )}
                  aria-label={open ? "Close menu" : "Open menu"}
                  aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p
                    className={cn(
                      "truncate font-display text-base font-black italic uppercase leading-tight",
                      t.brandTitle,
                    )}
                  >
                    {brand}
                  </p>
                  <p className={cn("truncate text-[10px] leading-snug", t.subtitle)}>{subtitle}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-1.5 border px-2.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                      t.menuBtn,
                    )}
                  >
                    <LogOut size={14} aria-hidden />
                    Logout
                  </button>
                </div>
              </div>

              <nav className={cn("border-t border-white/10", t.navBar)}>
                <div className="flex items-stretch gap-0.5 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <ApplicantNavLinks
                    nav={nav}
                    pathname={pathname}
                    navHrefs={navHrefs}
                    activeClass={t.navActive}
                    idleClass={t.navIdle}
                    lockedClass="cursor-not-allowed text-white/35"
                    itemClassName="shrink-0 whitespace-nowrap px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] transition"
                  />
                </div>
              </nav>
            </header>

            {open && (
              <div className="fixed inset-0 z-50 min-[480px]:hidden">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/60"
                  aria-label="Close menu overlay"
                  onClick={() => setOpen(false)}
                />
                <div
                  className={cn(
                    "absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col text-white shadow-2xl",
                    t.drawer,
                  )}
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", t.brandMark)}>
                        {t.badge} menu
                      </p>
                      <p className="font-display text-lg font-black italic uppercase">{brand}</p>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex min-h-11 min-w-11 items-center justify-center border",
                        t.menuBtn,
                      )}
                      aria-label="Close menu"
                      onClick={() => setOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
                    <p className="mb-3 break-words px-2 text-xs uppercase leading-snug tracking-[0.08em] text-white/70">
                      {userLabel}
                    </p>
                    <div className="flex flex-1 flex-col gap-2">
                      <ApplicantNavLinks
                        nav={nav}
                        pathname={pathname}
                        navHrefs={navHrefs}
                        activeClass={t.drawerActive}
                        idleClass={t.menuBtn}
                        lockedClass={cn(t.menuBtn, "cursor-not-allowed opacity-40")}
                        itemClassName="flex w-full items-center justify-center border px-3 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] transition"
                        onNavigate={() => setOpen(false)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        handleLogout();
                      }}
                      className={cn(
                        "mt-4 flex w-full items-center justify-center gap-2 border px-3 py-3 text-sm font-bold uppercase tracking-[0.08em]",
                        t.menuBtn,
                      )}
                    >
                      <LogOut size={16} aria-hidden />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </NominationProgressProvider>
        ) : (
          <>
            <nav className={cn("hidden min-[480px]:block", t.header, t.navBar)}>
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-1 px-4 py-2 sm:px-6">
                {nav.map((item) => {
                  const active = isNavActive(pathname, item.href, navHrefs);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition",
                        active ? t.navActive : t.navIdle,
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <header className={cn("text-white min-[480px]:hidden", t.header)}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center border",
                    t.menuBtn,
                  )}
                  aria-label={open ? "Close menu" : "Open menu"}
                  aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p
                    className={cn(
                      "truncate font-display text-base font-black italic uppercase leading-tight",
                      t.brandTitle,
                    )}
                  >
                    {brand}
                  </p>
                  <p className={cn("truncate text-[10px] leading-snug", t.subtitle)}>{subtitle}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {variant === "jury" && (
                    <Link
                      href="/jury-portal/profile"
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border",
                        t.menuBtn,
                      )}
                      title="My Profile"
                    >
                      {headerUser?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={userPhotoSrc(headerUser.photoUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-display text-sm font-black italic text-white/90">
                          {(headerUser?.fullName || userLabel).slice(0, 1)}
                        </span>
                      )}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-1.5 border px-2.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                      t.menuBtn,
                    )}
                  >
                    <LogOut size={14} aria-hidden />
                    Logout
                  </button>
                </div>
              </div>

              <nav className={cn("border-t border-white/10", t.navBar)}>
                <div className="flex items-stretch gap-0.5 overflow-x-auto px-2 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {nav.map((item) => {
                    const active = isNavActive(pathname, item.href, navHrefs);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "shrink-0 whitespace-nowrap px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] transition",
                          active ? t.navActive : t.navIdle,
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </header>
          </>
        )}
      </div>

      {variant !== "applicant" && open && (
        <div className="fixed inset-0 z-50 min-[480px]:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col text-white shadow-2xl",
              t.drawer,
            )}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", t.brandMark)}>
                  {t.badge} menu
                </p>
                <p className="font-display text-lg font-black italic uppercase">{brand}</p>
              </div>
              <button
                type="button"
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center border",
                  t.menuBtn,
                )}
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
              {variant !== "jury" && (
                <p className="mb-3 break-words px-2 text-xs uppercase leading-snug tracking-[0.08em] text-white/70">
                  {userLabel}
                </p>
              )}
              <div className="flex flex-1 flex-col gap-2">
                {nav.map((item) => {
                  const active = isNavActive(pathname, item.href, navHrefs);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex w-full items-center justify-center border px-3 py-3 text-center text-sm font-bold uppercase tracking-[0.08em] transition",
                        active ? t.drawerActive : t.menuBtn,
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 border px-3 py-3 text-sm font-bold uppercase tracking-[0.08em]",
                  t.menuBtn,
                )}
              >
                <LogOut size={16} aria-hidden />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-[1] mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  onClick,
  active,
}: {
  label: string;
  value: string | number;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const className = cn(
    "card border border-black/10 bg-white p-5 text-left transition",
    onClick && "card-hover cursor-pointer",
    active && "border-[#e8a914] bg-[#faf6eb] shadow-[0_0_0_1px_rgba(232,169,20,0.35)]",
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
          {label}
        </p>
        <p className="mt-2 font-display text-2xl font-black italic uppercase sm:text-3xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-[#666]">{hint}</p>}
      </button>
    );
  }

  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-gold-dark)]">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-black italic uppercase sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#666]">{hint}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = status.includes("Clarification")
    ? "badge-warn"
    : status.includes("Jury") || status.includes("Qualified") || status.includes("Finalist")
      ? "badge-teal"
      : status.includes("Not") || status.includes("Conflict")
        ? "badge bg-red-100 text-red-800"
        : "badge-muted";
  return <span className={cn(tone)}>{status}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track h-2.5 sm:h-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
