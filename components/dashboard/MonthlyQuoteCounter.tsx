"use client";

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
  const {
    isStarter,
    isLoading,
    monthlyQuotesUsed,
    monthlyQuotesLimit,
    remainingQuotes,
    canCreateNewQuote,
  } = useUserPlan();

  if (isLoading || !isStarter) return null;
  if (!Number.isFinite(monthlyQuotesLimit)) return null;

  const isLimitReached = !canCreateNewQuote;
  const lowRemaining = remainingQuotes <= 5 && !isLimitReached;
  const colorClass = isLimitReached
    ? "text-red-600"
    : lowRemaining
    ? "text-amber-600"
    : "text-[var(--text-secondary)]";

  return (
    <p className={cn("text-xs sm:text-sm font-medium", colorClass, className)}>
      {isLimitReached
        ? "Limite mensuelle atteinte"
        : `Vous avez créé ${monthlyQuotesUsed} / ${monthlyQuotesLimit} devis ce mois-ci`}
    </p>
  );
}
