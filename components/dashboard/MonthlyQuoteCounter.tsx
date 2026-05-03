"use client";

import { useMonthlyQuoteCount } from "@/lib/hooks/useMonthlyQuoteCount";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { cn } from "@/lib/utils";

/**
 * Compteur mensuel de devis — affiché uniquement pour les utilisateurs Starter.
 * Couleur :
 * - défaut (text-secondary) si remaining > 5
 * - amber-600 si remaining ≤ 5
 * - red-600 si limite atteinte
 */
export function MonthlyQuoteCounter({ className }: { className?: string }) {
  const { isStarter, isLoading: planLoading } = useUserPlan();
  const { isLoading, count, limit, remaining, isLimitReached } = useMonthlyQuoteCount();

  if (planLoading || !isStarter) return null;
  if (isLoading || !Number.isFinite(limit)) return null;

  const lowRemaining = remaining <= 5 && !isLimitReached;
  const colorClass = isLimitReached
    ? "text-red-600"
    : lowRemaining
    ? "text-amber-600"
    : "text-[var(--text-secondary)]";

  return (
    <p className={cn("text-xs sm:text-sm font-medium", colorClass, className)}>
      {isLimitReached
        ? "Limite mensuelle atteinte"
        : `Vous avez créé ${count} / ${limit} devis ce mois-ci`}
    </p>
  );
}
