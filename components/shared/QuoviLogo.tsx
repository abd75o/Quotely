import { cn } from "@/lib/utils";

type SizeAlias = "sm" | "md" | "lg";

const SIZE_PX: Record<SizeAlias, number> = {
  sm: 24,
  md: 36,
  lg: 48,
};

interface QuoviLogoProps {
  /**
   * Glyph side in px (the wordmark scales relative to it), OR one of the
   * aliases `sm` (24px) / `md` (36px) / `lg` (48px). Number wins when both
   * are passed.
   */
  size?: number | SizeAlias;
  /**
   * `false` by default — the logo paints immediately wherever it mounts.
   * `true` plays the landing mount animation: Q drifts from a centered
   * position then "uovi" letters stagger in. Use ONLY on surfaces that don't
   * re-mount on navigation (e.g. the landing header), otherwise it replays
   * every time and feels jumpy. The global `prefers-reduced-motion` rule in
   * globals.css neutralises the animation either way.
   */
  animated?: boolean;
  /** White wordmark on dark backgrounds (footer, hero overlays). */
  inverted?: boolean;
  /** Hide the wordmark — render just the orbit glyph (collapsed sidebar). */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Canonical Quovi wordmark. Used everywhere: navbar, sidebar, footer, auth
 * pages, public signature page. CSS-only animation when `animated` is true,
 * no framer-motion, no JS scheduler.
 */
export function QuoviLogo({
  size = "md",
  animated = false,
  inverted = false,
  iconOnly = false,
  className,
}: QuoviLogoProps) {
  const sizePx = typeof size === "number" ? size : SIZE_PX[size];
  const glyphColor = inverted ? "#FFFFFF" : "var(--primary, #6366F1)";
  const textColor = inverted ? "text-white" : "text-[#1E1B4B]";
  const wordPx = Math.round(sizePx * 0.625);
  // The Q starts "centered over the full wordmark" then slides left to its
  // final position. With the viewBox cropped (see QOrbitGlyph) so the Q
  // fills its size box, ~1.25em of the wordmark width lines up nicely.
  const shiftEm = "1.25em";

  if (iconOnly) {
    return (
      <span
        className={cn("inline-flex", className)}
        aria-label="Quovi"
      >
        <QOrbitGlyph size={sizePx} color={glyphColor} />
      </span>
    );
  }

  return (
    <div
      className={cn(
        // 2px gap so "Q" + "uovi" read as one word, not "Q   uovi". The Q
        // glyph carries no visual breathing room on its right edge anymore
        // (viewBox cropped), so the gap is the ONLY separator and small is
        // intentional.
        "inline-flex items-center gap-[2px]",
        // Inter, not the display serif: the brand mark is sans across the
        // whole product.
        "font-sans",
        className,
      )}
      aria-label="Quovi"
      style={
        {
          // CSS custom property the keyframe reads to know how far to slide.
          ["--q-shift" as string]: shiftEm,
        } as React.CSSProperties
      }
    >
      <span className={animated ? "quovi-logo-q inline-flex" : "inline-flex"}>
        <QOrbitGlyph size={sizePx} color={glyphColor} />
      </span>
      <span
        aria-hidden
        className={cn(
          "font-bold leading-none tracking-tight",
          textColor,
        )}
        style={{ fontSize: wordPx }}
      >
        {animated
          ? Array.from("uovi").map((ch, i) => (
              <span key={i} className="quovi-logo-letter">
                {ch}
              </span>
            ))
          : "uovi"}
      </span>
    </div>
  );
}

function QOrbitGlyph({ size, color }: { size: number; color: string }) {
  // ViewBox cropped to the actual ink bounds of the composition. The full
  // shape extends from ~(92, 92) (top-left of the ring outer edge) to
  // ~(444, 444) (right/bottom of the orbit dot). Cropping removes ~14% of
  // dead space on every side so the wordmark no longer reads "Q   uovi".
  return (
    <svg
      width={size}
      height={size}
      viewBox="92 92 352 352"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="256"
        cy="256"
        r="140"
        fill="none"
        stroke={color}
        strokeWidth="48"
      />
      <rect
        x="320"
        y="320"
        width="120"
        height="36"
        rx="18"
        fill={color}
        transform="rotate(45 380 338)"
      />
      <circle cx="430" cy="430" r="14" fill={color} />
    </svg>
  );
}
