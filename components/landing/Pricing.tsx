import { Check, Star, Shield } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Highlight } from "@/components/ui/Highlight";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const STARTER_FEATURES = [
  "Modèles prêts à l’emploi par métier",
  "Devis créé en quelques secondes (5 champs)",
  "TVA calculée automatiquement",
  "Lien de signature envoyé en un clic",
  "Signature en ligne (simple ou par email)",
  "Suivi en temps réel",
  "Facture générée après signature",
  "30 devis par mois",
  "Support par email sous 24 h",
];

const PRO_FEATURES = [
  "Tout le plan Starter inclus",
  "Devis créé en quelques secondes par dictée vocale",
  "Rédaction guidée des prestations",
  "Tarifs du marché suggérés",
  "Signature certifiée pour les missions importantes",
  "Relances automatiques (J+3, J+7, J+14)",
  "Tableau de bord (revenus en temps réel)",
  "Score de signature",
  "Devis illimités",
  "Support prioritaire",
];

export function Pricing() {
  return (
    <Section variant="alt" id="pricing">
      <Reveal className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          Un prix simple. Aucun engagement.
        </h2>
        <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
          <Highlight variant="warm">14 jours offerts</Highlight>. Sans carte bancaire. Résiliable en un clic.
        </p>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl xl:max-w-[992px] mx-auto items-stretch">
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
              <span className="text-[var(--text-muted)] mb-2 font-medium">/mois</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              Soit moins de 0,85 € par jour.
            </p>
          </div>

          <Button
            href="/inscription?plan=starter"
            variant="secondary"
            className="w-full mb-8"
          >
            Commencer gratuitement
          </Button>

          <ul className="space-y-3 flex-1">
            {STARTER_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-[var(--emerald-dark)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-start gap-2 p-3 bg-[var(--bg-secondary)] rounded-xl">
            <Shield className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[var(--text-muted)] leading-relaxed">
              Signature simple jusqu’à 1 500 €. Email confirmé jusqu’à 5 000 €.
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
            Populaire
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
              <span className="text-[var(--text-muted)] mb-2 font-medium">/mois</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
              Soit moins de 1,65 € par jour.
            </p>
          </div>

          <Button
            href="/inscription?plan=pro"
            variant="primary"
            icon
            className="w-full mb-8"
          >
            Démarrer mon essai Pro
          </Button>

          <ul className="space-y-3 flex-1">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-[var(--emerald-dark)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-start gap-2 p-3 bg-[var(--primary-bg)] rounded-xl">
            <Shield className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[var(--primary-dark)] leading-relaxed">
              Signature certifiée eIDAS pour devis &gt; 5 000 €.
            </span>
          </div>
        </Reveal>
      </div>

      <Reveal className="mt-12 text-center" delay={0.2}>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-full text-sm text-[var(--text-secondary)]">
          <Shield className="w-4 h-4 text-[var(--text-muted)]" />
          14 jours d’essai gratuit · Sans carte bancaire · Résiliable en un clic
        </div>
      </Reveal>
    </Section>
  );
}
