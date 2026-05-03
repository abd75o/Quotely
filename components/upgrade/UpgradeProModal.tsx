"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, X, ArrowRight } from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

const PRO_BENEFITS = [
  "Devis illimités",
  "Dictée vocale + IA",
  "Relances automatiques (J+3, J+7, J+14)",
  "Score de devis et tableau de bord",
];

export interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
  featureIcon?: ComponentType<LucideProps> | null;
}

export function UpgradeProModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  featureIcon: FeatureIcon,
}: UpgradeProModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleUpgrade() {
    // TODO Phase 2 : déclencher directement le checkout Stripe Pro
    // pour un Starter qui upgrade. Pour l'instant on ouvre la page tarifs.
    onClose();
    router.push("/paiement?plan=pro");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <span className="absolute top-5 right-5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
          <Sparkles className="w-3 h-3" />
          Pro
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-5 left-5 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mt-8 mb-5 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary-bg)] flex items-center justify-center">
            {FeatureIcon ? (
              <FeatureIcon className="w-7 h-7 text-[var(--primary)]" />
            ) : (
              <Sparkles className="w-7 h-7 text-[var(--primary)]" />
            )}
          </div>
        </div>

        <h2
          id="upgrade-modal-title"
          className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)] text-center leading-tight mb-3"
        >
          {featureName} est une fonctionnalité Pro
        </h2>

        {featureDescription && (
          <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed mb-6">
            {featureDescription}
          </p>
        )}

        <ul className="space-y-2.5 mb-6">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[var(--emerald-bg)] flex items-center justify-center">
                <Check className="w-3 h-3 text-[var(--emerald-dark)]" strokeWidth={3} />
              </span>
              <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--bg-secondary)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
              Plan actuel
            </p>
            <p className="text-sm font-bold text-[var(--text-primary)]">Starter</p>
            <p className="text-xs text-[var(--text-muted)]">25&nbsp;€ / mois</p>
          </div>
          <div className="rounded-xl border-2 border-[var(--primary)] p-3 bg-[var(--primary-bg)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-1">
              Plan Pro
            </p>
            <p className="text-sm font-bold text-[var(--text-primary)]">49&nbsp;€ / mois</p>
            <p className="text-xs text-[var(--primary-dark)] font-medium">+ 24&nbsp;€ / mois</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpgrade}
          className="group flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-md"
        >
          Passer au Pro maintenant
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="block w-full mt-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
