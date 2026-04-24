"use client";

import {
  Mic,
  FileText,
  Calculator,
  Send,
  PenLine,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Sparkles,
  Clock,
  Shield,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES_STARTER = [
  {
    icon: FileText,
    title: "Templates par métier",
    description:
      "Plombier, électricien, peintre, freelance, commerce — des modèles préconfigurés pour chaque corps de métier.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: Calculator,
    title: "Calcul TVA automatique",
    description:
      "Saisissez vos lignes, Quotely calcule la TVA et le total TTC instantanément. Zéro erreur.",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    icon: Send,
    title: "Envoi email en 1 clic",
    description:
      "Envoyez votre devis directement depuis la plateforme. Le client reçoit un lien professionnel signable.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    icon: PenLine,
    title: "Signature électronique",
    description:
      "Signature en ligne légale et sécurisée. Votre client signe depuis son téléphone en quelques secondes.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    icon: Clock,
    title: "Suivi en temps réel",
    description:
      "Signé, en attente, refusé — suivez l'état de chaque devis et recevez des notifications instantanées.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: FileText,
    title: "Facture en 1 clic",
    description:
      "Votre devis accepté se transforme en facture en un seul clic. Numérotation automatique et conforme.",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
];

const FEATURES_PRO = [
  {
    icon: Mic,
    title: "Dictée vocale IA",
    description:
      "Parlez, Quotely génère. Décrivez votre prestation à voix haute, l'IA structure et rédige le devis complet.",
    color: "text-purple-500",
    bg: "bg-purple-50",
    badge: "PRO",
  },
  {
    icon: Sparkles,
    title: "Génération par Claude AI",
    description:
      "L'IA analyse votre demande, suggère les bonnes lignes de devis et les formulations professionnelles.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    badge: "PRO",
  },
  {
    icon: TrendingUp,
    title: "Suggestions de prix IA",
    description:
      "L'IA vous suggère des tarifs cohérents avec le marché selon votre région et votre corps de métier.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    badge: "PRO",
  },
  {
    icon: RefreshCw,
    title: "Relances automatiques",
    description:
      "Quotely relance automatiquement les devis non signés à J+3, J+7 et J+14 avec un message personnalisé.",
    color: "text-blue-500",
    bg: "bg-blue-50",
    badge: "PRO",
  },
  {
    icon: BarChart3,
    title: "Statistiques intelligentes",
    description:
      "Taux de signature, CA prévisionnel, délai moyen — des métriques actionnables pour piloter votre activité.",
    color: "text-violet-500",
    bg: "bg-violet-50",
    badge: "PRO",
  },
  {
    icon: Shield,
    title: "Score de performance",
    description:
      "Chaque devis reçoit un score IA basé sur la clarté, la compétitivité des prix et la formulation.",
    color: "text-rose-500",
    bg: "bg-rose-50",
    badge: "PRO",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  bg,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  badge?: string;
}) {
  return (
    <div className="group relative p-6 bg-white rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-lg transition-all duration-300 cursor-default">
      {badge && (
        <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-bg)] rounded-full uppercase tracking-wide">
          {badge}
        </span>
      )}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110",
          bg
        )}
      >
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-bg)] text-[var(--primary)] text-xs font-semibold rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Tout ce dont vous avez besoin
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
            De la prestation à la facture,{" "}
            <span className="gradient-text">entièrement automatisé</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Chaque fonctionnalité est conçue pour vous faire gagner du temps et
            augmenter votre taux de signature.
          </p>
        </div>

        {/* Starter features */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-widest">
              Plan Starter
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-sm font-bold text-[var(--text-secondary)]">25€/mois</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES_STARTER.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>

        {/* Pro features */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 bg-[var(--primary-bg)] text-[var(--primary)] text-xs font-bold rounded-full uppercase tracking-widest">
              Plan Pro
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--primary)]/30 to-transparent" />
            <span className="text-sm font-bold text-[var(--primary)]">49€/mois</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES_PRO.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
