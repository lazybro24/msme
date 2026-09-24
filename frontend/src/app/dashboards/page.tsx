import Link from "next/link";

const portals = [
  {
    title: "Applicant Portal",
    body: "Register, business profile, categories, documents, and nomination submit.",
    login: "/nominate/login",
    home: "/nominate/dashboard",
    register: "/nominate/register",
  },
  {
    title: "Jury Portal",
    body: "Code of conduct, conflict disclosure, and evaluation scorecards.",
    login: "/jury-portal/login",
    home: "/jury-portal",
  },
  {
    title: "Process Observer",
    body: "Read-only process assurance and integrity oversight.",
    login: "/observer/login",
    home: "/observer",
  },
] as const;

export const metadata = {
  title: "Portal Login",
  robots: { index: false, follow: false },
};

export default function DashboardsPage() {
  return (
    <div className="page-awards-bg page-awards-bg--cream min-h-screen">
      <header className="border-b border-black/10 bg-[#0d0507] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-gold)]">
              Mysuru MSME Awards 2026
            </p>
            <h1 className="font-display text-xl font-black italic uppercase sm:text-2xl">
              Portal Login
            </h1>
          </div>
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-[0.1em] text-white/75 hover:text-white"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="max-w-2xl text-sm text-[#555]">
          Sign in to your portal with the account credentials issued by the Awards Secretariat.
          Do not share passwords. Email OTP is required after password login.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {portals.map((p) => (
            <article key={p.title} className="border border-black/10 bg-white p-5 sm:p-6">
              <h2 className="font-display text-xl font-black italic uppercase">{p.title}</h2>
              <p className="mt-2 text-sm text-[#666]">{p.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={p.login} className="btn-primary">
                  Login
                </Link>
                <Link href={p.home} className="btn-secondary">
                  Open portal
                </Link>
                {"register" in p && p.register ? (
                  <Link href={p.register} className="btn-ghost">
                    Register
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
