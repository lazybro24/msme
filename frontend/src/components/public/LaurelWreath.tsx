/** Decorative gold laurel for stage heroes (CSS/SVG — complements photo backgrounds) */
export function LaurelWreath({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="laurel-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5d56a" />
          <stop offset="45%" stopColor="#e8a914" />
          <stop offset="100%" stopColor="#c4890c" />
        </linearGradient>
      </defs>
      {/* Left branch */}
      <g stroke="url(#laurel-gold)" strokeWidth="3.5" strokeLinecap="round">
        <path d="M198 380 C120 340 70 280 55 200 C45 145 55 95 90 55" opacity="0.9" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const t = i / 8;
          const y = 360 - t * 290;
          const x = 190 - Math.sin(t * Math.PI) * (70 + t * 40);
          const rot = -25 - t * 35;
          return (
            <ellipse
              key={`l${i}`}
              cx={x}
              cy={y}
              rx="18"
              ry="8"
              fill="url(#laurel-gold)"
              opacity={0.55 + t * 0.35}
              transform={`rotate(${rot} ${x} ${y})`}
            />
          );
        })}
      </g>
      {/* Right branch */}
      <g stroke="url(#laurel-gold)" strokeWidth="3.5" strokeLinecap="round">
        <path d="M202 380 C280 340 330 280 345 200 C355 145 345 95 310 55" opacity="0.9" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const t = i / 8;
          const y = 360 - t * 290;
          const x = 210 + Math.sin(t * Math.PI) * (70 + t * 40);
          const rot = 25 + t * 35;
          return (
            <ellipse
              key={`r${i}`}
              cx={x}
              cy={y}
              rx="18"
              ry="8"
              fill="url(#laurel-gold)"
              opacity={0.55 + t * 0.35}
              transform={`rotate(${rot} ${x} ${y})`}
            />
          );
        })}
      </g>
      <path
        d="M170 375 Q200 395 230 375"
        stroke="url(#laurel-gold)"
        strokeWidth="4"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}
