"use client";

import Link from "next/link";
import {
  Check,
  Zap,
  Star,
  ArrowRight,
  Sparkles,
  Shield,
} from "lucide-react";

const STARTER_FEATURES = [
  "Templates prêts à l'emploi (par métier)",
  "Devis en 30 sec (5 champs seulement)",
  "TVA calculée automatiquement (zéro erreur)",
  "Lien de signature envoyé en 1 clic",
  "Signature en ligne (simple ou par email)",
  "Suivi en temps réel (signé, en attente, refusé)",
  "Facture générée automatiquement après signature",
  "30 devis/mois (suffisant pour démarrer)",
  "Support par email (réponse sous 24h)",
];

const PRO_FEATURES = [
  "Tout le Starter inclus",
  "Dictée vocale (devis généré en 10 sec)",
  "IA Claude (plus de temps perdu à rédiger)",
  "Prix suggérés (évite de se brader)",
  "Signature certifiée eIDAS (valide dès +5 000 €)",
  "Relances auto (plus de devis signés sans effort)",
  "Statistiques (optimise ton taux de signature)",
  "Score devis (sais ce qui fait signer)",
  "Devis illimités (aucune limite de croissance)",
  "Support prioritaire (réponse en moins de 2h)",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-bg)] text-[var(--primary)] text-xs font-semibold rounded-full mb-4">
            <Zap className="w-3.5 h-3.5" />
            Tarifs simples et transparents
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
            Commencez gratuitement,{" "}
            <span className="gradient-text">scalez quand vous voulez</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            14 jours d'essai gratuit, sans carte bancaire. Résiliable à tout moment.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Starter */}
          <div className="relative p-8 bg-white rounded-3xl border-2 border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-xl transition-all duration-300">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Starter</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Pour démarrer et gérer votre activité
              </p>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-[var(--text-primary)]">25€</span>
                <span className="text-[var(--text-muted)] mb-2 font-medium">/mois</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">
                soit 0,83€/jour
              </p>
            </div>

            <Link
              href="/signup?plan=starter"
              className="block w-full py-3.5 text-center text-sm font-semibold text-[var(--primary)] bg-[var(--primary-bg)] hover:bg-indigo-100 rounded-xl transition-colors duration-200 mb-8 cursor-pointer"
            >
              Commencer gratuitement
            </Link>

            <ul className="space-y-3">
              {STARTER_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[var(--emerald)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <Shield className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              <span className="text-xs text-[var(--text-muted)]">
                Signature simple pour &lt;1 500€ · Email confirmé jusqu'à 5 000€
              </span>
            </div>
          </div>

          {/* Pro */}
          <div className="relative p-8 bg-gradient-to-br from-[var(--primary)] via-indigo-600 to-purple-700 rounded-3xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
              <Star className="w-3 h-3 text-yellow-300" fill="currentColor" />
              <span className="text-xs font-bold text-white">Populaire</span>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
              <p className="text-sm text-indigo-200">Pour maximiser votre CA avec l'IA</p>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-white">49€</span>
                <span className="text-indigo-200 mb-2 font-medium">/mois</span>
              </div>
              <p className="text-xs text-indigo-300 mt-1.5 font-medium">
                soit 1,63€/jour
              </p>
            </div>

            <Link
              href="/signup?plan=pro"
              className="group flex items-center justify-center gap-2 w-full py-3.5 text-center text-sm font-semibold text-[var(--primary)] bg-white hover:bg-gray-50 rounded-xl transition-colors duration-200 mb-8 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Démarrer avec l'IA
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <ul className="space-y-3">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-indigo-100">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-2 p-3 bg-white/10 rounded-xl">
              <Shield className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-xs text-indigo-200">
                Signature certifiée eIDAS (YouSign) pour les devis &gt;5 000€
              </span>
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)]">
            <span className="text-base">🔒</span>
            14 jours d'essai gratuit · Sans carte bancaire · Résiliable en 1 clic
          </div>
        </div>
      </div>
    </section>
  );
}
