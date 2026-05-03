"use client";

import { Sparkles } from "lucide-react";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { cn } from "@/lib/utils";

const PRO_FEATURES = [
  "graphique d'évolution",
  "score de signature",
  "dictée vocale",
  "relances automatiques",
];

/**
 * Bannière discrète affichée en bas du dashboard Starter pour inviter
 * l'utilisateur à découvrir les fonctionnalités Pro.
 */
export function UpgradeBanner({ className }: { className?: string }) {
  const { showUpgradeModal } = useUpgradeModal();

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--primary)]/20 bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-5 sm:p-6",
        className
      )}
      aria-label="Découvrir le plan Pro"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              💡 Avec le plan Pro
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mt-0.5">
              {PRO_FEATURES.join(", ")}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            showUpgradeModal(
              "Plan Pro",
              "Débloquez la dictée vocale, l'IA, les graphiques d'évolution, le score de signature et les relances automatiques.",
              Sparkles
            )
          }
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl cursor-pointer transition-all shadow-sm self-start sm:self-auto flex-shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Découvrir le Pro
        </button>
      </div>
    </section>
  );
}
