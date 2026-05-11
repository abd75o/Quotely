import { Check, Star, Shield, X, Lock } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Highlight } from "@/components/ui/Highlight";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Tooltip } from "@/components/ui/Tooltip";
import type { UserStateValue } from "@/lib/hooks/useUserState";

const UPGRADE_TOOLTIP =
  "Bientôt disponible. Stripe en cours de configuration.";

const FREE_INCLUDED = [
  "Émile inclus (5 devis/mois)",
  "Devis au design pro (à votre image)",
  "TVA automatique",
  "Mentions légales automatiques",
  "Suivi simple des devis envoyés",
];

const FREE_NOT_INCLUDED = [
  "Signature en ligne par email",
  "Facture générée après signature",
  "Iris (relances automatiques)",
  "Tableau de bord",
  "Support prioritaire",
];

const STARTER_INCLUDED = [
  "Tout le plan Gratuit inclus",
  "Émile inclus (30 devis/mois)",
  "Signature en ligne par email",
  "Suivi en temps réel",
  "Facture générée après signature",
  "Support par email sous 24 h",
];

const STARTER_NOT_INCLUDED = [
  "Iris (relances automatiques)",
  "Signature certifiée pour les missions importantes",
  "Tableau de bord",
  "Devis illimités",
  "Support prioritaire",
];

const PRO_INCLUDED = [
  "Tout le plan Starter inclus",
  "Émile + Iris : l’équipe complète",
  "Signature certifiée pour les missions importantes",
  "Tableau de bord (revenus en temps réel)",
  "Jusqu’à 100 devis par mois",
  "Support prioritaire",
];

interface PricingProps {
  starterHref?: string;
  proHref?: string;
  showHeading?: boolean;
  unwrapped?: boolean;
  userState?: UserStateValue;
}

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

function getStarterCta(state: UserStateValue, fallbackHref: string): CardCta {
  switch (state) {
    case "subscribed_starter":
      return { kind: "current", label: "Votre plan actuel" };
    case "subscribed_pro":
      return { kind: "lower", label: "Plan inférieur" };
    case "subscribed_free":
      return { kind: "upgrade", label: "Passer à Starter →" };
    default:
      return { kind: "link", label: "Démarrer gratuitement", href: fallbackHref };
  }
}

function getProCta(state: UserStateValue, fallbackHref: string): CardCta {
  switch (state) {
    case "subscribed_pro":
      return { kind: "current", label: "Votre plan actuel ⭐" };
    case "subscribed_starter":
    case "subscribed_free":
      return { kind: "upgrade", label: "Passer à Pro →" };
    default:
      return { kind: "link", label: "Démarrer gratuitement", href: fallbackHref };
  }
}

const CTA_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold px-8 py-4 min-h-[52px] text-base w-full mb-8";

function CtaButton({
  cta,
  variant,
}: {
  cta: CardCta;
  variant: "secondary" | "primary";
}) {
  if (cta.kind === "link") {
    return (
      <Button
        href={cta.href}
        variant={variant}
        icon={variant === "primary"}
        className="w-full mb-8"
      >
        {cta.label}
      </Button>
    );
  }
  if (cta.kind === "current") {
    return (
      <span
        aria-disabled="true"
        className={`${CTA_BASE} font-bold text-[var(--primary)] bg-transparent border-2 border-[var(--primary)] cursor-default pointer-events-none`}
      >
        {cta.label}
      </span>
    );
  }
  if (cta.kind === "lower") {
    return (
      <span
        aria-disabled="true"
        className={`${CTA_BASE} text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border)] cursor-not-allowed pointer-events-none`}
      >
        {cta.label}
      </span>
    );
  }
  // upgrade
  const upgradeClasses =
    variant === "primary"
      ? `${CTA_BASE} text-white bg-[var(--primary)] shadow-md opacity-70 cursor-not-allowed`
      : `${CTA_BASE} text-[var(--primary)] bg-white border-2 border-[var(--primary)] opacity-70 cursor-not-allowed`;
  return (
    <Tooltip content={UPGRADE_TOOLTIP} className="block w-full">
      <span aria-disabled="true" className={upgradeClasses}>
        {cta.label}
      </span>
    </Tooltip>
  );
}

export function Pricing({
  starterHref = "/inscription?plan=starter",
  proHref = "/inscription?plan=pro",
  showHeading = true,
  unwrapped = false,
  userState = "visitor",
}: PricingProps = {}) {
  const freeCta = getFreeCta(userState);
  const starterCta = getStarterCta(userState, starterHref);
  const proCta = getProCta(userState, proHref);
  const isCurrentPro = userState === "subscribed_pro";

  const inner = (
    <>
      {showHeading && (
        <Reveal className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
            Un prix simple. Aucun engagement.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            <Highlight variant="warm">Plan gratuit disponible</Highlight>. Sans
            carte bancaire. Résiliable en un clic.
          </p>
        </Reveal>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl lg:max-w-6xl xl:max-w-[1200px] mx-auto items-stretch md:[&>*:nth-child(3)]:col-span-2 md:[&>*:nth-child(3)]:max-w-md md:[&>*:nth-child(3)]:justify-self-center md:[&>*:nth-child(3)]:w-full lg:[&>*:nth-child(3)]:col-span-1 lg:[&>*:nth-child(3)]:max-w-none lg:[&>*:nth-child(3)]:w-auto">
        {/* Free */}
        <Reveal className="flex flex-col p-8 bg-white rounded-2xl border border-[var(--border)] shadow-sm transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
          <div className="mb-6">
            <span className="inline-block px-3 py-1 mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--primary)] bg-[var(--primary-bg)] rounded-full">
              Gratuit
            </span>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Pour vos premiers devis, en PDF.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-bold text-[var(--text-primary)]">
                0 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              Sans engagement, sans carte bancaire.
            </p>
          </div>

          <CtaButton cta={freeCta} variant="secondary" />

          <div className="flex-1">
            <ul className="space-y-3">
              {FREE_INCLUDED.map((feature) => (
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

            <hr className="my-6 border-t border-[var(--border)]" />

            <ul className="space-y-3">
              {FREE_NOT_INCLUDED.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mt-0.5">
                    <X
                      className="w-3 h-3 text-[var(--text-muted)]"
                      strokeWidth={3}
                    />
                  </span>
                  <span className="text-sm text-[var(--text-muted)] leading-relaxed opacity-70">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-start gap-2 p-3 bg-[var(--primary-bg)] rounded-xl">
            <Lock className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[var(--primary-dark)] leading-relaxed">
              Sans carte bancaire, sans engagement.
            </span>
          </div>
        </Reveal>

        {/* Starter */}
        <Reveal className="flex flex-col p-8 bg-white rounded-2xl border border-[var(--border)] shadow-sm transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Starter
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Pour démarrer et gérer votre activité.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-bold text-[var(--text-primary)]">
                25 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              Soit moins de 0,85 € par jour.
            </p>
          </div>

          <CtaButton cta={starterCta} variant="secondary" />

          <div className="flex-1">
            <ul className="space-y-3">
              {STARTER_INCLUDED.map((feature) => (
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

            <hr className="my-6 border-t border-[var(--border)]" />

            <ul className="space-y-3">
              {STARTER_NOT_INCLUDED.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center mt-0.5">
                    <X
                      className="w-3 h-3 text-[var(--text-muted)]"
                      strokeWidth={3}
                    />
                  </span>
                  <span className="text-sm text-[var(--text-muted)] leading-relaxed opacity-70">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-start gap-2 p-3 bg-[var(--primary-bg)] rounded-xl">
            <Shield className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[var(--primary-dark)] leading-relaxed">
              Signature en ligne incluse pour tous vos devis.
            </span>
          </div>
        </Reveal>

        {/* Pro */}
        <Reveal
          delay={0.1}
          className="relative flex flex-col p-8 bg-white rounded-2xl border-2 border-[var(--primary)] shadow-xl transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5"
        >
          <span className="absolute -top-3 right-8 inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[var(--primary)] to-[#8B5CF6] text-white text-xs font-bold rounded-full shadow-md">
            <Star className="w-3 h-3" fill="currentColor" />
            {isCurrentPro ? "Actuel" : "Populaire"}
          </span>

          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-2">
              Pro
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Signez plus de clients sans y passer vos soirées.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-end gap-2">
              <span className="font-display text-5xl font-bold text-[var(--text-primary)]">
                49 €
              </span>
              <span className="text-[var(--text-muted)] mb-2 font-medium">
                /mois
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              Soit moins de 1,65 € par jour.
            </p>
          </div>

          <CtaButton cta={proCta} variant="primary" />

          <div className="flex-1">
            <ul className="space-y-3">
              {PRO_INCLUDED.map((feature) => (
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

            <hr className="my-6 border-t border-[var(--primary)]/20" />

            <p className="font-display italic text-base text-center text-[var(--primary)] py-4">
              Tout est inclus.
            </p>
          </div>

          <div className="mt-6 flex items-start gap-2 p-3 bg-[var(--primary-bg)] rounded-xl">
            <Shield className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[var(--primary-dark)] leading-relaxed">
              Signature certifiée eIDAS pour les missions importantes.
            </span>
          </div>
        </Reveal>
      </div>

      <Reveal className="mt-12 text-center" delay={0.2}>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-full text-sm text-[var(--text-secondary)]">
          <Shield className="w-4 h-4 text-[var(--text-muted)]" />
          Plan gratuit disponible · Sans carte bancaire · Résiliable en un clic
        </div>
      </Reveal>
    </>
  );

  if (unwrapped) {
    return inner;
  }

  return (
    <Section variant="alt" id="pricing">
      {inner}
    </Section>
  );
}
