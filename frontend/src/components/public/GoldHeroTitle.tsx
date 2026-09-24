"use client";

const lines = ["Recognizing Excellence", "Enabling Growth", "Inspiring Tomorrow"];

export function GoldHeroTitle({ className = "" }: { className?: string }) {
  return (
    <h1 className={`gold-title-3d ${className}`.trim()} aria-label={lines.join(" ")}>
      {lines.map((line) => (
        <span key={line} className="gold-title-3d__line">
          <span className="gold-title-3d__depth" aria-hidden>
            {line}
          </span>
          <span className="gold-title-3d__edge" aria-hidden>
            {line}
          </span>
          <span className="gold-title-3d__face">{line}</span>
        </span>
      ))}
    </h1>
  );
}
