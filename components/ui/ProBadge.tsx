"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md";

interface ProBadgeProps {
  className?: string;
  size?: Size;
  /** Affiche l'icône Sparkles à gauche du label. */
  withIcon?: boolean;
  /** Label personnalisé. Défaut "PRO". */
  label?: string;
  /** Si défini, le badge devient un bouton qui ouvre le modal upgrade. */
  onClick?: () => void;
  /** Aria-label si le badge est cliquable. */
  ariaLabel?: string;
}

const SIZES: Record<Size, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
};

const ICON_SIZES: Record<Size, string> = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
};

/**
 * Badge "PRO" doré (gradient indigo → violet) signalant une fonctionnalité
 * réservée aux abonnés Pro. Cliquable : ouvre le modal upgrade fourni par
 * le parent via `onClick`.
 */
export function ProBadge({
  className,
  size = "md",
  withIcon = true,
  label = "PRO",
  onClick,
  ariaLabel,
}: ProBadgeProps) {
  const base = cn(
    "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider",
    "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm",
    SIZES[size],
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? `${label} — fonctionnalité réservée au plan Pro`}
        className={cn(base, "cursor-pointer hover:from-indigo-600 hover:to-purple-600 transition-all")}
      >
        {withIcon && <Sparkles className={ICON_SIZES[size]} />}
        {label}
      </button>
    );
  }

  return (
    <span className={base} aria-label={ariaLabel ?? `${label} — fonctionnalité réservée au plan Pro`}>
      {withIcon && <Sparkles className={ICON_SIZES[size]} />}
      {label}
    </span>
  );
}
