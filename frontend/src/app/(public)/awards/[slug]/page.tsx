import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/public/PageHero";
import { Band, BandHeader, Tile } from "@/components/public/Section";
import { awardCategories, getCategoryBySlug } from "@/content/awards";

export function generateStaticParams() {
  return awardCategories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return { title: category?.title ?? "Award Category" };
}

export default async function AwardCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <>
      <PageHero
        eyebrow={`Category ${category.number}`}
        title={category.title}
        description={category.overview}
      />

      <Band tone="light">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Tile tone="light">
              <h2 className="section-title text-2xl">Overview</h2>
              <p className="prose-muted mt-3 !max-w-none">{category.overview}</p>
            </Tile>
            <ListBlock title="Eligibility" items={category.eligibility} tone="light" />
            <ListBlock title="Who Should Apply" items={category.whoShouldApply} tone="light" />
          </div>
          <aside>
            <Tile tone="ink" className="sticky top-24 !p-6">
              <p className="section-eyebrow !text-[var(--brand-gold)]">Apply</p>
              <h3 className="mt-2 font-display text-xl font-black uppercase tracking-tight text-white">
                {category.shortTitle}
              </h3>
              <p className="mt-2 text-sm text-white/65">
                {category.directApply
                  ? "Direct applications accepted. Maximum two categories per enterprise."
                  : "Direct applications are not accepted for this honour."}
              </p>
              {category.directApply ? (
                <Link
                  href="/nominate"
                  className="mt-6 inline-flex text-sm font-bold uppercase tracking-[0.1em] text-[var(--brand-gold)] underline-offset-4 hover:underline"
                >
                  Start Nomination →
                </Link>
              ) : (
                <Link
                  href="/about#integrity"
                  className="mt-6 inline-flex text-sm font-bold uppercase tracking-[0.1em] text-white/80 underline-offset-4 hover:underline"
                >
                  Learn Qualification Path →
                </Link>
              )}
              <Link
                href="/award-rules"
                className="mt-3 block text-xs font-bold uppercase tracking-[0.1em] text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
              >
                Award Rules
              </Link>
            </Tile>
          </aside>
        </div>
      </Band>

      <Band tone="dark">
        <BandHeader eyebrow="Scorecard" title="Evaluation Criteria" />
        <Tile tone="dark" className="mx-auto mt-8 max-w-3xl">
          <ul className="space-y-3">
            {category.criteria.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm text-white/80 last:border-0"
              >
                <span>{row.name}</span>
                <span className="font-extrabold text-[var(--brand-gold)]">{row.points} pts</span>
              </li>
            ))}
            <li className="flex justify-between pt-2 text-sm font-extrabold uppercase tracking-wide text-white">
              <span>Total</span>
              <span>100</span>
            </li>
          </ul>
        </Tile>
      </Band>

      <Band tone="light">
        <div className="space-y-6">
          <Tile tone="light">
            <h2 className="section-title text-2xl">
              Category-Specific Achievement &amp; Evidence Requirements
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#555]">
              Please provide relevant documents demonstrating your enterprise&apos;s achievements
              in this award category. Equivalent supporting evidence may be accepted, subject to
              verification. Coverage is expected across all five assessment areas.
            </p>
            <div className="mt-5 overflow-x-auto border border-black/10">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <thead className="bg-[#1a0c10] text-white">
                  <tr>
                    <th className="w-12 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                      No.
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                      Supporting evidence document
                    </th>
                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                      Purpose
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {category.supportingEvidence.map((item, i) => (
                    <tr
                      key={item.document}
                      className="border-t border-black/10 odd:bg-[#f7f4f2] even:bg-white"
                    >
                      <td className="px-3 py-3 align-top text-xs font-bold text-[var(--brand-gold-dark)]">
                        {i + 1}
                      </td>
                      <td className="px-3 py-3 align-top leading-snug text-[#333]">
                        {item.document}
                      </td>
                      <td className="px-3 py-3 align-top text-[13px] leading-snug text-[#666]">
                        {item.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {category.recommendedAdditional && (
              <p className="mt-4 text-sm leading-relaxed text-[#555]">
                <span className="font-semibold text-[#222]">Recommended additional evidence: </span>
                {category.recommendedAdditional}
              </p>
            )}
            {category.juryFocus && (
              <p className="mt-2 text-sm leading-relaxed text-[#555]">
                <span className="font-semibold text-[#222]">Jury focus: </span>
                {category.juryFocus}
              </p>
            )}
            {category.evidenceNotes?.map((note) => (
              <p
                key={note}
                className="mt-3 border border-[var(--brand-gold)]/35 bg-[#fff8e8] px-3 py-2.5 text-sm leading-relaxed text-[#444]"
              >
                <span className="font-semibold text-[#222]">Important: </span>
                {note}
              </p>
            ))}
          </Tile>
          <ListBlock title="Recognition" items={category.recognition} tone="light" />
        </div>
      </Band>
    </>
  );
}

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "light" | "dark";
}) {
  return (
    <Tile tone={tone}>
      <h2 className={tone === "dark" ? "font-display text-2xl font-black italic uppercase text-white" : "section-title text-2xl"}>
        {title}
      </h2>
      <ul className="mt-5 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className={
              tone === "dark"
                ? "border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                : "border border-black/10 bg-[#f7f4f2] px-3 py-2 text-sm"
            }
          >
            {item}
          </li>
        ))}
      </ul>
    </Tile>
  );
}
