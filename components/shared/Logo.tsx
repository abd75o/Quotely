import { cn } from "@/lib/utils";

interface LogoProps {
  /** Show icon only (no wordmark) */
  iconOnly?: boolean;
  /** Icon size in px (square) */
  size?: number;
  /** Extra classes on the wrapper */
  className?: string;
  /** Wordmark color — defaults to dark */
  textColor?: string;
}

export function Logo({
  iconOnly = false,
  size = 32,
  className,
  textColor = "#0f0f23",
}: LogoProps) {
  const fontSize = size * 0.585;
  const totalWidth = iconOnly ? size : size + size * 0.35 + size * 3.3;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalWidth} ${size}`}
      width={totalWidth}
      height={size}
      fill="none"
      aria-label="Quotely"
      role="img"
      className={cn("flex-shrink-0", className)}
    >
      <defs>
        <linearGradient id="ql-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="ql-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Icon background ── */}
      <rect width={size} height={size} rx={size * 0.25} fill="url(#ql-bg)" />
      <rect width={size} height={size * 0.55} rx={size * 0.25} fill="url(#ql-shine)" />

      {/* Scale everything inside the icon relative to its size */}
      <g transform={`scale(${size / 40})`}>
        {/* < bracket */}
        <path
          d="M14 13 L8 20 L14 27"
          stroke="white"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* > bracket */}
        <path
          d="M26 13 L32 20 L26 27"
          stroke="white"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pencil — tilted like / */}
        <g transform="rotate(-25, 20, 20)">
          {/* Eraser cap */}
          <rect x="18.5" y="10" width="3" height="2.8" rx="1.4" fill="#FDA4AF" />
          {/* Ferrule */}
          <rect x="18.2" y="12.8" width="3.6" height="2" rx="0.4" fill="rgba(255,255,255,0.55)" />
          {/* Body */}
          <rect x="18.5" y="14.8" width="3" height="9.5" rx="0.3" fill="white" />
          {/* Wood cone */}
          <path d="M18.5 24.3 L21.5 24.3 L20 28.5 Z" fill="rgba(255,255,255,0.72)" />
          {/* Graphite tip */}
          <line
            x1="20" y1="27" x2="20" y2="29"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* ── Wordmark ── */}
      {!iconOnly && (
        <text
          x={size + size * 0.35}
          y={size * 0.7}
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontSize={fontSize}
          fontWeight="700"
          letterSpacing="-0.4"
          fill={textColor}
        >
          Quotely
        </text>
      )}
    </svg>
  );
}
