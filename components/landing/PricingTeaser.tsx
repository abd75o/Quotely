"use client";

import { Check } from "lucide-react";
import { IconStarFilled } from "@tabler/icons-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUserState, type UserStateValue } from "@/lib/hooks/useUserState";
import { PLAN_FEATURES } from "@/lib/permissions";

const UPGRADE_TOOLTIP =
  "Bientôt disponible. Stripe en cours de configuration.";

const FREE_HIGHLIGHTS = [
  `Émile inclus (${PLAN_FEATURES.free.maxDevisPerMonth} devis/mois)`,
  "Devis au design pro (à votre image)",
  "TVA automatique",
  "Mentions légales automatiques",
  "Suivi simple des devis envoyés",
];

const STARTER_HIGHLIGHTS = [
  "Tout le plan Gratuit inclus",
  `Émile inclus (${PLAN_FEATURES.starter.maxDevisPerMonth} devis/mois)`,
  "Signature en ligne par email",
  "Suivi en temps réel",
  "Facture générée après signature",
  "Support par email sous 24 h",
];

const PRO_HIGHLIGHTS = [
  "Tout le plan Starter inclus",
  "Signature certifiée pour les missions importantes",
  "Tableau de bord (revenus en temps réel)",
  `Jusqu’à ${PLAN_FEATURES.pro.maxDevisPerMonth} devis par mois`,
  "Support prioritaire",
];

type CardCta =
  | { kind: "link"; label: string; href: string }
  | { kind: "current"; label: string }
  | { kind: "lower"; label: string }
  | { kind: "upgrade"; label: string };

function getFreeCta(state: UserStateValue): CardCta {
  switch (state) {
    case "subscribed_free":
      return { kind: "current", label: "Votre plan actuel" };
    case "subscribed_starter":
    case "subscribed_pro":
      return { kind: "lower", label: "Plan inférieur" };
    default:
      return {
        kind: "link",
        label: "Démarrer gratuitement",
        href: "/inscription?plan=free",
      };
  }
}

function getStarterCta(state: UserStateValue): CardCta {
  switch (state) {
    case "subscribed_starter":
      return { kind: "current", label: "Votre plan actuel" };
    case "subscribed_pro":
      return { kind: "lower", label: "Plan inférieur" };
    case "subscribed_free":
      return { kind: "upgrade", label: "Passer à Starter →" };
    default:
      return {
        kind: "link",
        label: "Démarrer gratuitement",
        href: "/inscription?plan=starter",
      };
  }
}

function getProCta(state: UserStateValue): CardCta {
  switch (state) {
    case "subscribed_pro":
      return { kind: "current", label: "Votre plan actuel ⭐" };
    case "subscribed_starter":
    case "subscribed_free":
      return { kind: "upgrade", label: "Passer à Pro →" };
    default:
      return {
        kind: "link",
        label: "Démarrer gratuitement",
        href: "/inscription?plan=pro",
      };
  }
}

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

function AgentLine({ label, suffix }: { label: string; suffix: string }) {
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

const BTN_BASE =
  "inline-flex items-center justify-center w-full py-3 px-5 rounded-full text-sm font-medium transition-colors";

function TeaserCta({
  cta,
  primary = false,
}: {
  cta: CardCta;
  primary?: boolean;
}) {
  if (cta.kind === "link") {
    const cls = primary
      ? `${BTN_BASE} font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]`
      : `${BTN_BASE} border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]`;
    return (
      <a href={cta.href} className={cls}>
        {cta.label}
      </a>
    );
  }
  if (cta.kind === "current") {
    return (
      <span
        aria-disabled="true"
        className={`${BTN_BASE} font-bold border-2 border-[var(--primary)] text-[var(--primary)] cursor-default pointer-events-none`}
      >
        {cta.label}
      </span>
    );
  }
  if (cta.kind === "lower") {
    return (
      <span
        aria-disabled="true"
        className={`${BTN_BASE} border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed pointer-events-none`}
      >
        {cta.label}
      </span>
    );
  }
  // upgrade
  const upgradeCls = primary
    ? `${BTN_BASE} font-semibold bg-[var(--primary)] text-white opacity-70 cursor-not-allowed`
    : `${BTN_BASE} border-2 border-[var(--primary)] text-[var(--primary)] opacity-70 cursor-not-allowed`;
  return (
    <Tooltip content={UPGRADE_TOOLTIP} className="block w-full">
      <span aria-disabled="true" className={upgradeCls}>
        {cta.label}
      </span>
    </Tooltip>
  );
}

export function PricingTeaser() {
  const { state, isLoading } = useUserState();
  const effectiveState: UserStateValue = isLoading ? "visitor" : state;
  const isAuthed = effectiveState !== "visitor";
  const isCurrentPro = effectiveState === "subscribed_pro";

  const title = isAuthed ? "Votre plan actuel." : "Un prix simple. Aucun engagement.";
  const subtitle = isAuthed
    ? null
    : "Démarrez gratuitement. Évoluez quand vous êtes prêt. Résiliable en un clic.";

  const ctaLabel = isAuthed ? "Gérer mon abonnement" : "Voir tous les détails et choisir mon plan";
  const ctaHref = isAuthed ? "/dashboard" : "/tarifs";

  const freeCta = getFreeCta(effectiveState);
  const starterCta = getStarterCta(effectiveState);
  const proCta = getProCta(effectiveState);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto items-stretch">
        {/* FREE */}
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
            Pour vos premiers devis, en PDF.
          </p>

          <ul className="space-y-3 mb-6 flex-1">
            {FREE_HIGHLIGHTS.map((feature) => (
              <FeatureCheck key={feature}>{feature}</FeatureCheck>
            ))}
          </ul>

          <TeaserCta cta={freeCta} />
        </Reveal>

        {/* STARTER */}
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
            Pour démarrer et gérer votre activité.
          </p>

          <ul className="space-y-3 mb-6 flex-1">
            {STARTER_HIGHLIGHTS.map((feature) => (
              <FeatureCheck key={feature}>{feature}</FeatureCheck>
            ))}
          </ul>

          <TeaserCta cta={starterCta} />
        </Reveal>

        {/* PRO */}
        <Reveal
          delay={0.1}
          className="relative flex flex-col p-8 bg-white rounded-2xl border-2 border-[var(--primary)] shadow-xl shadow-[var(--primary)]/10 transition-all duration-200 hover:shadow-2xl hover:shadow-[var(--primary)]/20 hover:-translate-y-0.5"
        >
          <span className="absolute -top-3 right-8 inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--primary)] text-white text-xs font-bold rounded-full shadow-md">
            <IconStarFilled size={12} />
            {isCurrentPro ? "Actuel" : "Populaire"}
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

          <TeaserCta cta={proCta} primary />
        </Reveal>
      </div>

      <Reveal delay={0.2} className="mt-10 md:mt-12 flex justify-center">
        <Button href={ctaHref} variant="primary" icon className="w-full sm:w-auto">
          {ctaLabel}
        </Button>
      </Reveal>
    </Section>
  );
}
