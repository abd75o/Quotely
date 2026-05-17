"use client";

import { BarChart2, CheckCircle2, Euro, FileText, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewQuoteButton } from "@/components/quotes/NewQuoteButton";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { LockedFeature } from "@/components/shared/LockedFeature";
import { MonthlyRevenueChart } from "./MonthlyRevenueChart";
import { TopClientsList } from "./TopClientsList";
import { TopPrestationsList } from "./TopPrestationsList";
import { InsightsCard } from "./InsightsCard";
import type { UserStats } from "@/lib/stats/calculations";

interface Props {
  stats: UserStats;
}

export function StatsView({ stats }: Props) {
  const hasNoData = stats.totalQuotesCreated === 0;

  if (hasNoData) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Statistiques" subtitle="Suivez la performance de votre activité" />
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <EmptyState
            icon={BarChart2}
            title="Tes premières stats apparaîtront ici"
            description="Crée ton premier devis pour démarrer."
            cta={
              <NewQuoteButton className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Créer un devis
              </NewQuoteButton>
            }
          />
        </div>
      </div>
    );
  }

  // Teaser stats shared by all locked sections
  const teaserStats = [
    {
      label: "CA signé",
      value: `${stats.totalRevenueSigned.toLocaleString("fr-FR")} €`,
    },
    { label: "Clients actifs", value: stats.totalActiveClients },
    { label: "Taux signature", value: `${stats.signatureRate}%` },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Statistiques" subtitle="Suivez la performance de votre activité" />

      {/* Section 1 — Chiffres clés (visibles par tous) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatTile
          label="CA signé"
          value={`${stats.totalRevenueSigned.toLocaleString("fr-FR")} €`}
          icon={Euro}
          color="violet"
          sub="Total période"
        />
        <StatTile
          label="Taux signature"
          value={`${stats.signatureRate}%`}
          icon={CheckCircle2}
          color="emerald"
          sub={`${stats.totalQuotesSigned} / ${stats.totalQuotesCreated} devis`}
        />
        <StatTile
          label="Devis créés"
          value={stats.totalQuotesCreated}
          icon={FileText}
          color="indigo"
        />
        <StatTile
          label="Clients actifs"
          value={stats.totalActiveClients}
          icon={Users}
          color="sky"
        />
      </section>

      {/* Section 2 — Graphique 12 mois (Pro only) */}
      <div className="mb-6">
        <LockedFeature
          feature="canUseRevenueChart"
          requiredPlan="pro"
          variant="overlay"
          teaser={{
            title: "Débloquer mes statistiques avancées",
            description:
              "Tu as déjà construit du chemin. Avec le Pro, vois l'évolution mois par mois.",
            stats: teaserStats,
          }}
        >
          <MonthlyRevenueChart data={stats.monthlyRevenue12Months} />
        </LockedFeature>
      </div>

      {/* Sections 3 + 4 — Top clients / prestations (Pro only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <LockedFeature
          feature="canUseAdvancedStats"
          requiredPlan="pro"
          variant="overlay"
          teaser={{
            title: "Top 5 clients",
            description: "Identifie qui rapporte le plus à ton activité.",
            stats: teaserStats,
          }}
        >
          <TopClientsList clients={stats.topClients} />
        </LockedFeature>

        <LockedFeature
          feature="canUseAdvancedStats"
          requiredPlan="pro"
          variant="overlay"
          teaser={{
            title: "Top 5 prestations",
            description: "Découvre ce que tu factures le plus.",
            stats: teaserStats,
          }}
        >
          <TopPrestationsList prestations={stats.topPrestations} />
        </LockedFeature>
      </div>

      {/* Section 5 — Insights (Pro only) */}
      <LockedFeature
        feature="canUseAdvancedStats"
        requiredPlan="pro"
        variant="overlay"
        teaser={{
          title: "Insights personnalisés",
          description:
            "Quovi analyse ton activité et te dit ce qui marche le mieux pour toi.",
          stats: teaserStats,
        }}
      >
        <InsightsCard insights={stats.insights} />
      </LockedFeature>
    </div>
  );
}
