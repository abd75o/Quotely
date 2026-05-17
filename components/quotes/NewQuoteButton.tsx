"use client";

import { type ReactNode } from "react";
import { FileText } from "lucide-react";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { useStartEmileQuote } from "@/lib/emile/use-start-quote";

interface NewQuoteButtonProps {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  onClick?: () => void;
  /** Optional client name to mention in the seed prompt to Émile. */
  clientName?: string;
}

/**
 * Bouton « Nouveau devis » plan-aware.
 * - Si la limite mensuelle du plan est atteinte → ouvre l'UpgradeProModal au lieu de naviguer.
 * - Sinon → crée une nouvelle conversation Émile et navigue vers /dashboard/emile/<id>.
 *   La création passe TOUJOURS par Émile (le rédacteur conversationnel). Pas de
 *   formulaire manuel — c'est le différenciateur produit de Quovi.
 */
export function NewQuoteButton({
  className,
  children,
  ariaLabel,
  onClick,
  clientName,
}: NewQuoteButtonProps) {
  const { canCreateNewQuote, monthlyQuotesLimit, features, isLoading } = useUserPlan();
  const { showUpgradeModal } = useUpgradeModal();
  const { startNewQuote, starting } = useStartEmileQuote();

  const blocked = !isLoading && !canCreateNewQuote;

  if (blocked) {
    const nextLabel = features.nextUpgrade
      ? features.nextUpgrade.charAt(0).toUpperCase() + features.nextUpgrade.slice(1)
      : "supérieur";
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          onClick?.();
          showUpgradeModal(
            "Devis illimités",
            `Vous avez atteint la limite de ${monthlyQuotesLimit} devis ce mois-ci sur le plan ${features.label}. Passez au ${nextLabel} pour aller plus loin.`,
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
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={starting}
      onClick={() => {
        onClick?.();
        void startNewQuote(clientName ? { clientName } : undefined);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
