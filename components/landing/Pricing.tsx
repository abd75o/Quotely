"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Star,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STARTER_FEATURES = [
  "5 templates par métier (plombier, électricien, peintre, freelance, commerce)",
  "Formulaire simplifié 5 champs",
  "Calcul TVA automatique",
  "Envoi par email au client",
  "Signature électronique en ligne",
  "Suivi des devis (signé, en attente, refusé)",
  "Facturation en 1 clic",
  "Jusqu'à 20 devis/mois",
  "Support par email",
];

const PRO_FEATURES = [
  "Tout le plan Starter inclus",
  "Dictée vocale — l'IA génère le devis",
  "Génération de devis par Claude AI",
  "Suggestions de prix selon le marché",
  "Relances automatiques (J+3, J+7, J+14)",
  "Statistiques intelligentes et métriques",
  "Score de performance des devis",
  "Devis illimités",
  "Support prioritaire + chat",
];

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const starterPrice = isAnnual ? 15 : 19;
  const proPrice = isAnnual ? 31 : 39;

  return (
    <section id="pricing" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* Background decoration */}
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

          {/* Annual toggle */}
          <div className="inline-flex items-center gap-3 mt-8 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                !isAnnual
                  ? "bg-white shadow-sm text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-2",
                isAnnual
                  ? "bg-white shadow-sm text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Annuel
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                -20%
              </span>
            </button>
          </div>
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
                <span className="text-5xl font-black text-[var(--text-primary)]">
                  {starterPrice}€
                </span>
                <span className="text-[var(--text-muted)] mb-2 font-medium">/mois</span>
              </div>
              {isAnnual && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Facturé <span className="font-semibold text-[var(--emerald)]">{starterPrice * 12}€/an</span> · Économisez 48€
                </p>
              )}
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
          </div>

          {/* Pro */}
          <div className="relative p-8 bg-gradient-to-br from-[var(--primary)] via-indigo-600 to-purple-700 rounded-3xl shadow-2xl overflow-hidden">
            {/* Shine effect */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

            {/* Popular badge */}
            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
              <Star className="w-3 h-3 text-yellow-300" fill="currentColor" />
              <span className="text-xs font-bold text-white">Populaire</span>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
              <p className="text-sm text-indigo-200">
                Pour maximiser votre CA avec l'IA
              </p>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-white">{proPrice}€</span>
                <span className="text-indigo-200 mb-2 font-medium">/mois</span>
              </div>
              {isAnnual && (
                <p className="text-xs text-indigo-300 mt-1">
                  Facturé <span className="font-semibold text-white">{proPrice * 12}€/an</span> · Économisez 96€
                </p>
              )}
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
