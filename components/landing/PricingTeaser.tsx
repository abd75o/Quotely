"use client";

import { Check, Star } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useUserState } from "@/lib/hooks/useUserState";

const STARTER_HIGHLIGHTS = [
  "TVA calculée automatiquement",
  "Signature électronique légale",
  "30 devis par mois",
];

const PRO_HIGHLIGHTS = [
  "Dictée vocale sur le terrain",
  "Relances automatiques (J+3, J+7, J+14)",
  "Devis illimités + tableau de bord",
];

export function PricingTeaser() {
  const { state, daysLeft, isLoading } = useUserState();
  const effectiveState = isLoading ? "visitor" : state;
  const isSubscribed =
    effectiveState === "subscribed_starter" ||
    effectiveState === "subscribed_pro";

  let title = "Un prix simple. Aucun engagement.";
  let subtitle: string | null =
    "14 jours offerts. Sans carte bancaire. Résiliable en un clic.";

  if (effectiveState === "trial_active" || effectiveState === "trial_expired") {
    title = "Choisissez le plan qui vous correspond.";
    subtitle =
      effectiveState === "trial_active"
        ? `Il vous reste ${daysLeft ?? 14} jour${
            (daysLeft ?? 14) > 1 ? "s" : ""
          } d'essai gratuit.`
        : "Votre essai gratuit est terminé. Choisissez votre plan.";
  } else if (isSubscribed) {
    title = "Votre plan actuel.";
    subtitle = null;
  }

  const ctaLabel = isSubscribed
    ? "Gérer mon abonnement"
    : effectiveState === "visitor"
    ? "Voir tous les détails et choisir mon plan"
    : "Voir tous les détails";
  // TODO Phase 2: replace /dashboard with /dashboard/abonnement for subscribed users
  const ctaHref = isSubscribed ? "/dashboard" : "/tarifs";

  return (
    <Section variant="alt" id="tarifs" className="py-20 md:py-32">
      <Reveal className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            {subtitle}
          </p>
        )}
      </Reveal>

      <div
        className={
          isSubscribed
            ? "max-w-md mx-auto"
            : "grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch"
        }
      >
        {/* Starter mini */}
        {(!isSubscribed || effectiveState === "subscribed_starter") && (
        <Reveal className="flex flex-col p-8 bg-white rounded-2xl border-[1.5px] border-[var(--border)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
          <span className="self-start inline-block px-3 py-1 mb-4 text-[10px] font-bold uppercase tracking-widest rounded-full bg-[var(--primary-bg)] text-[var(--primary-dark)]">
            Starter
          </span>

          <div className="mb-2">
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-bold text-[var(--text-primary)]">
                25 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
            Pour démarrer et gérer votre activité.
          </p>

          <ul className="space-y-3">
            {STARTER_HIGHLIGHTS.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--emerald-bg)] flex items-center justify-center mt-0.5">
                  <Check
                    className="w-3 h-3 text-[var(--emerald-dark)]"
                    strokeWidth={3}
                  />
                </span>
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
        )}

        {/* Pro mini */}
        {(!isSubscribed || effectiveState === "subscribed_pro") && (
        <Reveal
          delay={0.1}
          className="relative flex flex-col p-8 bg-white rounded-2xl border-2 border-[var(--primary)] shadow-xl shadow-[var(--primary)]/10 transition-all duration-200 hover:shadow-2xl hover:shadow-[var(--primary)]/20 hover:-translate-y-0.5"
        >
          <span className="absolute -top-3 right-8 inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[var(--primary)] to-[#8B5CF6] text-white text-xs font-bold rounded-full shadow-md">
            <Star className="w-3 h-3" fill="currentColor" />
            Populaire
          </span>

          <span className="self-start inline-block px-3 py-1 mb-4 text-[10px] font-bold uppercase tracking-widest rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8B5CF6] text-white shadow-sm">
            Pro
          </span>

          <div className="mb-2">
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-bold text-[var(--text-primary)]">
                49 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
            Signez plus de clients sans y passer vos soirées.
          </p>

          <ul className="space-y-3">
            {PRO_HIGHLIGHTS.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--emerald-bg)] flex items-center justify-center mt-0.5">
                  <Check
                    className="w-3 h-3 text-[var(--emerald-dark)]"
                    strokeWidth={3}
                  />
                </span>
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
        )}
      </div>

      <Reveal delay={0.2} className="mt-10 md:mt-12 flex justify-center">
        <Button
          href={ctaHref}
          variant="primary"
          icon
          className="w-full sm:w-auto"
        >
          {ctaLabel}
        </Button>
      </Reveal>
    </Section>
  );
}
