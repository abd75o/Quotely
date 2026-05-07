import { cn } from "@/lib/utils";

const Q_PATH =
  "M497.725 259.208C501.724 258.857 508.415 258.935 512.493 258.962C577.355 259.634 639.289 286.058 684.659 332.415C732.944 381.214 759.724 447.286 759.041 515.932C758.636 565.417 739.512 619.404 710.374 659.021C704.609 666.858 696.941 677.028 690.095 683.771C717.356 711.674 745.35 738.351 772.603 766.005C737.936 765.526 703.785 766.85 669.286 766.943C598.412 693.502 525.907 621.652 451.826 551.447C483.924 551.509 515.99 550.834 548.074 551.167C551.58 550.965 563.534 552.356 565.991 554.763C581.616 570.077 596.238 586.744 611.527 602.483C618.319 609.474 624.749 616.828 631.522 623.852C660.834 587.373 675.591 548.317 672.599 500.859C669.591 453.155 650.194 414.469 614.044 382.852C586.231 358.925 551.12 345.144 514.456 343.765C473.107 342.306 427.48 359.605 398.046 388.366C364.031 421.602 346.648 460.294 345.178 507.543C343.755 552.816 360.563 596.766 391.832 629.538C415.805 654.555 447.211 671.169 481.381 676.912C494.854 679.059 503.75 678.965 517.093 679.376C520.221 683.612 525.437 689.034 529.095 692.977C536.438 700.931 543.898 708.775 551.472 716.509C559.563 724.878 579.503 747.417 589.151 751.769C568.619 759.378 547.06 763.857 525.196 765.056C386.182 773.82 267.805 665.395 259.723 527.248C255.909 460.839 278.411 395.6 322.353 345.662C368.314 294.006 428.361 263.232 497.725 259.208Z";

/**
 * Standalone Q glyph — free-form (no square frame), filled with the brand indigo.
 */
function QIcon({ size = 40, color }: { size: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={Q_PATH} fill={color ?? "var(--primary, #6366F1)"} />
    </svg>
  );
}

interface LogoProps {
  /**
   * icon       — Q glyph only (navbar icon, favicons, small usages)
   * horizontal — Q + "Quovi" side by side (navbar, footer)
   * stacked    — Q above "Quovi" above slogan (hero, branding)
   */
  variant?: "icon" | "horizontal" | "stacked";
  /** Base size in px: icon glyph side. Text scales proportionally. */
  size?: number;
  /** White wordmark + slogan for dark backgrounds */
  inverted?: boolean;
  className?: string;
  /** Optional instance ID kept for backwards compatibility */
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
  const glyphColor = inverted ? "#FFFFFF" : undefined;

  if (variant === "icon") {
    return (
      <span className={cn("inline-flex", className)} aria-label="Quovi">
        <QIcon size={size} color={glyphColor} />
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <div
        className={cn("flex flex-col items-center", className)}
        aria-label="Quovi — Un devis. Un clic. Une signature."
      >
        <QIcon size={size} color={glyphColor} />
        <p
          className={cn(
            "font-display mt-3 font-bold tracking-tight leading-none",
            wordColor
          )}
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
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Quovi"
    >
      <QIcon size={size} color={glyphColor} />
      <span
        className={cn(
          "font-display font-bold tracking-tight leading-none",
          wordColor
        )}
        style={{ fontSize: Math.round(size * 0.625) }}
      >
        Quovi
      </span>
    </div>
  );
}
