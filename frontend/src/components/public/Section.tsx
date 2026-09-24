import { cn } from "@/lib/utils";

type Tone = "dark" | "light" | "light-alt" | "gold" | "pillars";

const toneClass: Record<Tone, string> = {
  dark: "band-dark",
  light: "band-light",
  "light-alt": "band-light-alt",
  gold: "band-gold",
  pillars: "band-pillars",
};

export function Band({
  tone,
  children,
  className,
  id,
  narrow,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
  id?: string;
  narrow?: boolean;
}) {
  return (
    <section id={id} className={cn("band scroll-mt-24", toneClass[tone], className)}>
      <div className={narrow ? "container-narrow" : "container-page"}>{children}</div>
    </section>
  );
}

export function BandHeader({
  eyebrow,
  title,
  description,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={cn(center && "mx-auto max-w-3xl text-center")}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2 className="section-title mt-3">{title}</h2>
      {description && <p className="prose-muted mt-3 mx-auto">{description}</p>}
      <div className="band-rule mt-6" aria-hidden />
    </div>
  );
}

export function Tile({
  tone = "light",
  children,
  className,
  as: Tag = "div",
  id,
  onSubmit,
}: {
  tone?: "light" | "dark" | "ink" | "awards";
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "li" | "form";
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  id?: string;
}) {
  const classNames = cn(
    "tile",
    tone === "light" && "tile-light",
    tone === "dark" && "tile-dark",
    tone === "ink" && "tile-ink",
    tone === "awards" && "tile-awards",
    className,
  );

  if (Tag === "form") {
    return (
      <form id={id} onSubmit={onSubmit} className={classNames}>
        {children}
      </form>
    );
  }

  return (
    <Tag id={id} className={classNames}>
      {children}
    </Tag>
  );
}
