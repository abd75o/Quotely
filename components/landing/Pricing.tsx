import Link from "next/link";
import { Check, Star, ArrowRight, Shield } from "lucide-react";

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
  "Signature certifiée pour les chantiers conséquents",
  "Relances automatiques (J+3, J+7, J+14)",
  "Tableau de bord (revenus en temps réel)",
  "Score de signature",
  "Devis illimités",
  "Support prioritaire",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Un prix simple. Aucun engagement.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            14 jours offerts. Sans carte bancaire. Résiliable en un clic.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Starter */}
          <div className="relative flex flex-col p-8 bg-white rounded-3xl border-2 border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-lg transition-all duration-200">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Starter</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Pour démarrer et gérer votre activité.
              </p>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-[var(--text-primary)]">25 €</span>
                <span className="text-[var(--text-muted)] mb-2 font-medium">/mois</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">
                Soit moins de 0,85 € par jour.
              </p>
            </div>

            <Link
              href="/inscription?plan=starter"
              className="flex items-center justify-center gap-2 w-full min-h-[52px] py-3.5 text-sm font-semibold text-[var(--primary)] bg-[var(--primary-bg)] hover:bg-indigo-100 rounded-xl transition-colors duration-200 mb-8 cursor-pointer"
            >
              Commencer gratuitement
            </Link>

            <ul className="space-y-3 flex-1">
              {STARTER_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[var(--emerald)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-start gap-2 p-3 bg-[var(--surface)] rounded-xl">
              <Shield className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
              <span className="text-xs text-[var(--text-muted)] leading-relaxed">
                Signature simple jusqu’à 1 500 €. Email confirmé jusqu’à 5 000 €.
              </span>
            </div>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col p-8 bg-gradient-to-br from-[var(--primary)] via-indigo-600 to-purple-700 rounded-3xl shadow-xl overflow-hidden">
            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full">
              <Star className="w-3 h-3 text-yellow-300" fill="currentColor" />
              <span className="text-xs font-bold text-white">Populaire</span>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
              <p className="text-sm text-indigo-100">
                Signez plus de clients sans y passer vos soirées.
              </p>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-white">49 €</span>
                <span className="text-indigo-200 mb-2 font-medium">/mois</span>
              </div>
              <p className="text-xs text-indigo-200 mt-1.5 font-medium">
                Soit moins de 1,65 € par jour.
              </p>
            </div>

            <Link
              href="/inscription?plan=pro"
              className="group flex items-center justify-center gap-2 w-full min-h-[52px] py-3.5 text-sm font-semibold text-[var(--primary)] bg-white hover:bg-gray-50 rounded-xl transition-colors duration-200 mb-8 shadow-md cursor-pointer"
            >
              Démarrer mon essai Pro
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <ul className="space-y-3 flex-1">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-indigo-50 leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-start gap-2 p-3 bg-white/10 rounded-xl">
              <Shield className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-indigo-100 leading-relaxed">
                Signature certifiée eIDAS pour devis &gt; 5 000 €.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)]">
            <Shield className="w-4 h-4 text-[var(--text-muted)]" />
            14 jours d’essai gratuit · Sans carte bancaire · Résiliable en un clic
          </div>
        </div>
      </div>
    </section>
  );
}
