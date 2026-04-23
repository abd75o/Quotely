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
  /** Unique suffix for gradient IDs to avoid conflicts */
  id?: string;
}

export function Logo({
  iconOnly = false,
  size = 32,
  className,
  textColor = "#0f0f23",
  id = "a",
}: LogoProps) {
  const scale = size / 40;
  const fontSize = Math.round(size * 0.575);
  const gap = Math.round(size * 0.3);
  // Approximate text width for "Quotely" at this font-size
  const textWidth = Math.round(fontSize * 3.9);
  const totalWidth = iconOnly ? size : size + gap + textWidth;

  const bgId = `ql-bg-${id}`;
  const shineId = `ql-shine-${id}`;

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
        <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id={shineId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Icon (scaled to size × size) ── */}
      <g transform={`scale(${scale})`}>
        {/* Background rounded square */}
        <rect width="40" height="40" rx="10" fill={`url(#${bgId})`} />
        <rect width="40" height="22" rx="10" fill={`url(#${shineId})`} />

        {/* Document body — white paper with folded top-right corner */}
        <path d="M8 6 L25 6 L32 13 L32 34 L8 34 Z" fill="white" fillOpacity="0.97" />

        {/* Fold shadow */}
        <path d="M25 6 L32 13 L25 13 Z" fill="rgba(99,102,241,0.2)" />

        {/* Content lines (representing quote rows) */}
        <line x1="12" y1="16" x2="20" y2="16" stroke="rgba(99,102,241,0.28)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="19.5" x2="24" y2="19.5" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5" strokeLinecap="round" />

        {/* Bold checkmark */}
        <path
          d="M12 25 L17.5 31 L28 17"
          stroke="#6366F1"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* ── Wordmark ── */}
      {!iconOnly && (
        <text
          x={size + gap}
          y={size * 0.695}
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
