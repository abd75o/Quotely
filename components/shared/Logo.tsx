import { cn } from "@/lib/utils";

/**
 * Standalone Q icon — indigo rounded square with bold white Q.
 * Inspired by Revolut / Linear / Notion: single letter, ultra minimal.
 */
function QIcon({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="#6366F1" stroke="#1f2937" strokeWidth="1" />
      <rect x="0.5" y="0.5" width="39" height="20" rx="10" fill="white" fillOpacity="0.1" />
      <text
        x="20"
        y="29"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        fontSize="25"
        fontWeight="800"
        letterSpacing="-0.5"
        fill="white"
      >
        Q
      </text>
    </svg>
  );
}

interface LogoProps {
  /**
   * icon     — Q square only (navbar icon, favicons, small usages)
   * horizontal — Q + "Quovi" side by side (navbar, footer)
   * stacked  — Q above "Quovi" above slogan (hero, branding)
   */
  variant?: "icon" | "horizontal" | "stacked";
  /** Base size in px: icon square side. Text scales proportionally. */
  size?: number;
  /** White wordmark + slogan for dark backgrounds */
  inverted?: boolean;
  className?: string;
  /** Optional instance ID to namespace SVG gradient IDs when multiple logos coexist */
  id?: string;
}

export function Logo({
  variant = "horizontal",
  size = 32,
  inverted = false,
  className,
  id: _id,
}: LogoProps) {
  const wordColor = inverted ? "text-white" : "text-[var(--text-primary)]";
  const sloganColor = inverted ? "text-indigo-200" : "text-gray-400";

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex", className)} aria-label="Quovi">
        <QIcon size={size} />
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={cn("flex flex-col items-center", className)}
        aria-label="Quovi — Un devis. Un clic. Une signature."
      >
        <QIcon size={size} />
        <p
          className={cn("mt-3 font-bold tracking-tight leading-none", wordColor)}
          style={{ fontSize: Math.round(size * 0.55) }}
        >
          Quovi
        </p>
        <p
          className={cn("mt-1.5 font-medium leading-none", sloganColor)}
          style={{ fontSize: Math.round(size * 0.225) }}
        >
          Un devis. Un clic. Une signature.
        </p>
      </div>
    );
  }

  // horizontal (default)
  return (
    <div
      className={cn("inline-flex items-center", className)}
      aria-label="Quovi"
    >
      <QIcon size={size} />
      <span
        className={cn("ml-2.5 font-bold tracking-tight leading-none", wordColor)}
        style={{ fontSize: Math.round(size * 0.625) }}
      >
        Quovi
      </span>
    </div>
  );
}
