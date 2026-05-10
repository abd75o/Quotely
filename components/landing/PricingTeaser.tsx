"use client";

import { Check } from "lucide-react";
import { IconStarFilled } from "@tabler/icons-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useUserState } from "@/lib/hooks/useUserState";

const FREE_HIGHLIGHTS = [
  "Émile inclus pour 3 devis/mois",
  "Signature électronique légale",
  "Modèles par métier",
];

const STARTER_HIGHLIGHTS = [
  "Émile inclus pour vos devis",
  "TVA calculée automatiquement",
  "Signature électronique légale",
  "30 devis par mois",
  "Modèles par métier",
];

const PRO_HIGHLIGHTS = [
  "Devis illimités",
  "Relances automatiques (J+3, J+7, J+14)",
  "Tableau de bord",
  "Support prioritaire",
];

function FeatureCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check
        className="flex-shrink-0 w-4 h-4 mt-1 text-[var(--primary)]"
        strokeWidth={3}
      />
      <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {children}
      </span>
    </li>
  );
}

function AgentLine({
  label,
  suffix,
}: {
  label: string;
  suffix: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <Check
        className="flex-shrink-0 w-4 h-4 mt-1 text-[var(--primary)]"
        strokeWidth={3}
      />
      <span className="text-sm leading-relaxed font-medium text-[var(--primary)]">
        <strong className="font-semibold">{label}</strong>
        <span className="font-normal text-[var(--text-secondary)]">
          {" "}
          — {suffix}
        </span>
      </span>
    </li>
  );
}

export function PricingTeaser() {
  const { state, isLoading } = useUserState();
  const effectiveState = isLoading ? "visitor" : state;
  const isSubscribed =
    effectiveState === "subscribed_starter" ||
    effectiveState === "subscribed_pro";

  let title = "Un prix simple. Aucun engagement.";
  let subtitle: string | null =
    "Démarrez gratuitement. Évoluez quand vous êtes prêt. Résiliable en un clic.";

  if (effectiveState === "trial_active" || effectiveState === "trial_expired") {
    title = "Choisissez le plan qui vous correspond.";
    subtitle = "Démarrez gratuitement, montez en gamme quand vous êtes prêt.";
  } else if (isSubscribed) {
    title = "Votre plan actuel.";
    subtitle = null;
  }

  const ctaLabel = isSubscribed
    ? "Gérer mon abonnement"
    : "Voir tous les détails et choisir mon plan";
  const ctaHref = isSubscribed ? "/dashboard" : "/tarifs";

  const showFree = !isSubscribed;
  const showStarter = !isSubscribed || effectiveState === "subscribed_starter";
  const showPro = !isSubscribed || effectiveState === "subscribed_pro";

  const visibleCount = [showFree, showStarter, showPro].filter(Boolean).length;

  const gridClasses =
    visibleCount === 1
      ? "max-w-md mx-auto"
      : visibleCount === 2
        ? "grid sm:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto items-stretch"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto items-stretch";

  return (
    <Section variant="alt" id="tarifs" className="py-20 md:py-28">
      <Reveal className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
        <p className="font-mono text-[0.78rem] uppercase tracking-[0.05em] text-[var(--text-muted)] mb-4">
          4.0 · Tarifs
        </p>
        <h2 className="font-display text-[32px] md:text-[40px] font-medium leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            {subtitle}
          </p>
        )}
      </Reveal>

      <div className={gridClasses}>
        {/* FREE */}
        {showFree && (
          <Reveal className="flex flex-col p-8 bg-white rounded-2xl border-[1.5px] border-[var(--border)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
            <span className="self-start inline-block px-3 py-1 mb-4 text-[10px] font-bold uppercase tracking-widest rounded-full bg-[var(--primary-bg)] text-[var(--primary-dark)]">
              Gratuit
            </span>

            <div className="mb-2 flex items-end gap-2">
              <span className="font-display text-5xl font-medium text-[var(--text-primary)]">
                0 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              Pour vos premiers devis.
            </p>

            <ul className="space-y-3 mb-6 flex-1">
              {FREE_HIGHLIGHTS.map((feature) => (
                <FeatureCheck key={feature}>{feature}</FeatureCheck>
              ))}
            </ul>

            <a
              href="/inscription"
              className="inline-flex items-center justify-center w-full py-3 px-5 rounded-full border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Démarrer gratuitement
            </a>
          </Reveal>
        )}

        {/* STARTER */}
        {showStarter && (
          <Reveal
            delay={0.05}
            className="flex flex-col p-8 bg-white rounded-2xl border-[1.5px] border-[var(--border)] transition-all duration-200 hover:border-[var(--primary)]/40 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
          >
            <span className="self-start inline-block px-3 py-1 mb-4 text-[10px] font-bold uppercase tracking-widest rounded-full bg-[var(--primary-bg)] text-[var(--primary-dark)]">
              Starter
            </span>

            <div className="mb-2 flex items-end gap-2">
              <span className="font-display text-5xl font-medium text-[var(--text-primary)]">
                25 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              Pour les artisans qui veulent gagner leurs soirées.
            </p>

            <ul className="space-y-3 mb-6 flex-1">
              {STARTER_HIGHLIGHTS.map((feature) => (
                <FeatureCheck key={feature}>{feature}</FeatureCheck>
              ))}
            </ul>

            <a
              href="/inscription"
              className="inline-flex items-center justify-center w-full py-3 px-5 rounded-full border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Démarrer gratuitement
            </a>
          </Reveal>
        )}

        {/* PRO */}
        {showPro && (
          <Reveal
            delay={0.1}
            className="relative flex flex-col p-8 bg-white rounded-2xl border-2 border-[var(--primary)] shadow-xl shadow-[var(--primary)]/10 transition-all duration-200 hover:shadow-2xl hover:shadow-[var(--primary)]/20 hover:-translate-y-0.5"
          >
            <span className="absolute -top-3 right-8 inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--primary)] text-white text-xs font-bold rounded-full shadow-md">
              <IconStarFilled size={12} />
              Populaire
            </span>

            <span className="self-start inline-block px-3 py-1 mb-4 text-[10px] font-bold uppercase tracking-widest rounded-full bg-[var(--primary-bg)] text-[var(--primary-dark)]">
              Pro
            </span>

            <div className="mb-2 flex items-end gap-2">
              <span className="font-display text-5xl font-medium text-[var(--text-primary)]">
                49 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              Signez plus de clients sans y passer vos soirées.
            </p>

            <ul className="space-y-3 mb-6 flex-1">
              <AgentLine
                label="Émile + Iris inclus"
                suffix="l’équipe complète"
              />
              {PRO_HIGHLIGHTS.map((feature) => (
                <FeatureCheck key={feature}>{feature}</FeatureCheck>
              ))}
            </ul>

            <a
              href="/inscription"
              className="inline-flex items-center justify-center w-full py-3 px-5 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] transition-colors"
            >
              Démarrer gratuitement
            </a>
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
