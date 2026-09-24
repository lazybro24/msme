/** Colorful full-bleed category artwork for selection cards */
export function CategoryBackdrop({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const id = code.toLowerCase();

  return (
    <svg
      className={className}
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      {code === "MOTY" && <MotyArt id={id} />}
      {code === "MFG" && <MfgArt id={id} />}
      {code === "SRV" && <SrvArt id={id} />}
      {code === "EMG" && <EmgArt id={id} />}
      {code === "INN" && <InnArt id={id} />}
      {code === "GRW" && <GrwArt id={id} />}
      {code === "WEN" && <WenArt id={id} />}
      {code === "YEN" && <YenArt id={id} />}
      {code === "SSI" && <SsiArt id={id} />}
      {code === "EMP" && <EmpArt id={id} />}
      {!["MOTY", "MFG", "SRV", "EMG", "INN", "GRW", "WEN", "YEN", "SSI", "EMP"].includes(code) && (
        <DefaultArt id={id} />
      )}
    </svg>
  );
}

/** @deprecated use CategoryBackdrop — kept for any leftover imports */
export function CategoryIcon(props: { code: string; className?: string }) {
  return <CategoryBackdrop {...props} />;
}

function MotyArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a1018" />
          <stop offset="100%" stopColor="#5a2a14" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="50%" stopColor="#e8a914" />
          <stop offset="100%" stopColor="#c4890c" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="260" cy="40" r="70" fill="#e8a914" opacity="0.15" />
      <circle cx="40" cy="170" r="50" fill="#ff6b4a" opacity="0.18" />
      <path
        d="M160 28l18 54h57l-46 34 18 54-47-34-47 34 18-54-46-34h57l18-54z"
        fill={`url(#${id}-gold)`}
        opacity="0.92"
      />
      <rect x="118" y="168" width="84" height="10" rx="2" fill="#e8a914" />
      <rect x="130" y="156" width="60" height="8" rx="2" fill="#f5d56a" opacity="0.85" />
    </g>
  );
}

function MfgArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0f2438" />
        </linearGradient>
        <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7ec8ff" />
          <stop offset="100%" stopColor="#3a7ca5" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="280" cy="30" r="60" fill="#f4a261" opacity="0.2" />
      <path d="M40 160V90l35-22v22l35-22v22l35-22v92H40z" fill={`url(#${id}-steel)`} opacity="0.9" />
      <rect x="190" y="70" width="28" height="90" fill="#e9c46a" opacity="0.85" />
      <rect x="230" y="50" width="22" height="110" fill="#f4a261" opacity="0.75" />
      <circle cx="70" cy="140" r="8" fill="#ffd166" />
      <circle cx="110" cy="140" r="8" fill="#ffd166" />
      <circle cx="150" cy="140" r="8" fill="#ffd166" />
      <path d="M0 170h320v30H0z" fill="#061525" opacity="0.45" />
    </g>
  );
}

function SrvArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#134e4a" />
          <stop offset="100%" stopColor="#0f2f3a" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="60" cy="40" r="50" fill="#2dd4bf" opacity="0.2" />
      <circle cx="250" cy="150" r="70" fill="#38bdf8" opacity="0.18" />
      <circle cx="160" cy="78" r="38" fill="#5eead4" opacity="0.95" />
      <circle cx="160" cy="78" r="28" fill="#99f6e4" />
      <path
        d="M95 175c8-42 35-58 65-58s57 16 65 58"
        fill="#14b8a6"
        opacity="0.9"
      />
      <path d="M210 70c18-4 34 8 34 24" stroke="#fde68a" strokeWidth="6" strokeLinecap="round" />
      <circle cx="244" cy="94" r="6" fill="#fbbf24" />
    </g>
  );
}

function EmgArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="100%" stopColor="#431407" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="260" cy="50" r="55" fill="#fb923c" opacity="0.25" />
      <path d="M160 170V55" stroke="#fdba74" strokeWidth="8" strokeLinecap="round" />
      <path d="M160 55l-32 40M160 55l32 40" stroke="#fde68a" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M90 170c18-50 42-72 70-72s52 22 70 72"
        fill="#ea580c"
        opacity="0.55"
      />
      <circle cx="230" cy="42" r="16" fill="#fbbf24" />
      <circle cx="230" cy="42" r="8" fill="#fef08a" />
    </g>
  );
}

function InnArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0c4a6e" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="160" cy="80" r="70" fill={`url(#${id}-glow)`} />
      <path
        d="M160 30c-28 0-50 22-50 50 0 22 12 36 26 46v22h48v-22c14-10 26-24 26-46 0-28-22-50-50-50z"
        fill="#38bdf8"
      />
      <path
        d="M160 42c-18 0-32 14-32 32 0 14 8 24 18 30v8h28v-8c10-6 18-16 18-30 0-18-14-32-32-32z"
        fill="#7dd3fc"
      />
      <rect x="138" y="148" width="44" height="10" rx="2" fill="#fbbf24" />
      <rect x="144" y="162" width="32" height="8" rx="2" fill="#f59e0b" />
      <path d="M148 95h24M160 83v24" stroke="#0c4a6e" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function GrwArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="100%" stopColor="#052e16" />
        </linearGradient>
        <linearGradient id={`${id}-bar`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="40" cy="40" r="45" fill="#4ade80" opacity="0.15" />
      <rect x="48" y="120" width="36" height="50" fill={`url(#${id}-bar)`} opacity="0.7" />
      <rect x="100" y="95" width="36" height="75" fill={`url(#${id}-bar)`} opacity="0.85" />
      <rect x="152" y="70" width="36" height="100" fill={`url(#${id}-bar)`} />
      <rect x="204" y="48" width="36" height="122" fill="#bef264" />
      <path
        d="M70 130 L120 105 L170 85 L230 45"
        stroke="#fde047"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="230" cy="45" r="10" fill="#facc15" />
      <path d="M230 45l18-18M248 27h-14M248 27v14" stroke="#fde047" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function WenArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9d174d" />
          <stop offset="100%" stopColor="#4a044e" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="260" cy="160" r="70" fill="#f472b6" opacity="0.2" />
      <circle cx="50" cy="40" r="40" fill="#fb7185" opacity="0.22" />
      <circle cx="160" cy="70" r="32" fill="#fda4af" />
      <circle cx="160" cy="70" r="22" fill="#fecdd3" />
      <path d="M100 175c10-48 32-68 60-68s50 20 60 68" fill="#ec4899" opacity="0.9" />
      <path d="M160 105v20M140 125h40" stroke="#fce7f3" strokeWidth="5" strokeLinecap="round" />
      <circle cx="160" cy="148" r="10" fill="#fbbf24" />
      <path d="M160 138l3 7h8l-6 5 2 8-7-4-7 4 2-8-6-5h8l3-7z" fill="#fef08a" />
    </g>
  );
}

function YenArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="280" cy="40" r="55" fill="#fbbf24" opacity="0.25" />
      <circle cx="160" cy="78" r="36" fill="#fdba74" />
      <circle cx="160" cy="78" r="26" fill="#fed7aa" />
      <path d="M100 175c8-45 32-62 60-62s52 17 60 62" fill="#ea580c" opacity="0.9" />
      <path
        d="M128 58c8-22 20-30 32-30s24 8 32 30"
        stroke="#fef08a"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M148 36l12-14 12 14" fill="#fde047" />
      <circle cx="250" cy="55" r="14" fill="#facc15" />
      <path d="M250 48v14M243 55h14" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function SsiArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#022c22" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="50" cy="150" r="60" fill="#34d399" opacity="0.18" />
      <circle cx="280" cy="40" r="50" fill="#6ee7b7" opacity="0.2" />
      <ellipse cx="160" cy="110" rx="70" ry="55" fill="#10b981" opacity="0.85" />
      <ellipse cx="160" cy="110" rx="48" ry="38" fill="#34d399" />
      <path
        d="M160 55c8 18 24 28 24 46a24 24 0 11-48 0c0-18 16-28 24-46z"
        fill="#a7f3d0"
      />
      <path d="M160 100v40" stroke="#065f46" strokeWidth="4" strokeLinecap="round" />
      <circle cx="240" cy="70" r="18" fill="#38bdf8" opacity="0.7" />
      <circle cx="248" cy="62" r="8" fill="#e0f2fe" opacity="0.8" />
    </g>
  );
}

function EmpArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="40" cy="40" r="45" fill="#60a5fa" opacity="0.2" />
      <circle cx="280" cy="160" r="55" fill="#38bdf8" opacity="0.22" />
      <circle cx="110" cy="72" r="28" fill="#93c5fd" />
      <circle cx="110" cy="72" r="18" fill="#dbeafe" />
      <circle cx="210" cy="72" r="28" fill="#7dd3fc" />
      <circle cx="210" cy="72" r="18" fill="#e0f2fe" />
      <path d="M55 175c6-42 28-58 55-58s49 16 55 58" fill="#2563eb" opacity="0.9" />
      <path d="M155 175c6-42 28-58 55-58s49 16 55 58" fill="#0284c7" opacity="0.9" />
      <circle cx="160" cy="120" r="14" fill="#fbbf24" />
      <path d="M160 112l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5l2-5z" fill="#fef08a" />
    </g>
  );
}

function DefaultArt({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#44403c" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      <circle cx="160" cy="100" r="50" fill="#e8a914" opacity="0.35" />
    </g>
  );
}
