"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { useMonthlyQuoteCount } from "@/lib/hooks/useMonthlyQuoteCount";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";

interface NewQuoteButtonProps {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  onClick?: () => void;
}

/**
 * Bouton « Nouveau devis » plan-aware.
 * - Starter avec count >= 30 ce mois → ouvre l'UpgradeProModal au lieu de naviguer.
 * - Sinon → comportement Link standard vers /dashboard/quotes/new.
 */
export function NewQuoteButton({
  className,
  children,
  ariaLabel,
  onClick,
}: NewQuoteButtonProps) {
  const { isStarter } = useUserPlan();
  const { isLimitReached } = useMonthlyQuoteCount();
  const { showUpgradeModal } = useUpgradeModal();

  const blocked = isStarter && isLimitReached;

  if (blocked) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          onClick?.();
          showUpgradeModal(
            "Devis illimités",
            "Vous avez atteint la limite de 30 devis ce mois-ci sur le plan Starter. Passez au Pro pour créer des devis sans limite.",
            FileText
          );
        }}
        className={className}
      >
        {children}
      </button>
    );
  }

  return (
    <Link
      href="/dashboard/quotes/new"
      className={className}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
