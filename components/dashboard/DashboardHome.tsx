"use client";

import { CheckCircle2, Clock, Euro, FileText } from "lucide-react";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { MonthlyQuoteCounter } from "@/components/dashboard/MonthlyQuoteCounter";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { HeroGreeting } from "@/components/dashboard/HeroGreeting";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { StatCardWithSparkline } from "@/components/dashboard/StatCardWithSparkline";
import { RevenueChart6m } from "@/components/dashboard/RevenueChart6m";
import { TopClients } from "@/components/dashboard/TopClients";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import type { DashboardData } from "@/lib/dashboard/data";

interface DashboardHomeProps {
  data: DashboardData;
  welcome: boolean;
}

export function DashboardHome({ data, welcome }: DashboardHomeProps) {
  const { isStarter, isLoading } = useUserPlan();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
      {welcome && <WelcomeBanner />}

      <HeroGreeting
        firstName={data.firstName}
        todayLabel={data.todayLabel}
        subtitle={data.greetingSubtitle}
      />

      <QuickActions />

      <MonthlyQuoteCounter className="-mt-2" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardWithSparkline
          label="Devis créés"
          value={data.stats.total.value.toLocaleString("fr-FR")}
          subtitle="Ce mois-ci"
          deltaPercent={data.stats.total.deltaPercent}
          sparkline={data.stats.total.sparkline}
          icon={FileText}
          tone="indigo"
        />
        <StatCardWithSparkline
          label="Signés"
          value={data.stats.signed.value.toLocaleString("fr-FR")}
          subtitle="Devis signés du mois"
          deltaPercent={data.stats.signed.deltaPercent}
          sparkline={data.stats.signed.sparkline}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCardWithSparkline
          label="En attente"
          value={data.stats.pending.value.toLocaleString("fr-FR")}
          subtitle={
            data.stats.pending.value > 0 ? "À relancer" : "Aucun en attente"
          }
          deltaPercent={data.stats.pending.deltaPercent}
          sparkline={data.stats.pending.sparkline}
          icon={Clock}
          tone="amber"
        />
        <StatCardWithSparkline
          label="Chiffre d'affaires"
          value={`${data.stats.revenue.value.toLocaleString("fr-FR")} €`}
          subtitle="Signés ce mois-ci"
          deltaPercent={data.stats.revenue.deltaPercent}
          sparkline={data.stats.revenue.sparkline}
          icon={Euro}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart6m data={data.revenue6m} />
        </div>
        <div className="lg:col-span-2">
          <TopClients clients={data.topClients} />
        </div>
      </div>

      <ActivityFeed entries={data.activity} />

      {!isLoading && isStarter && <UpgradeBanner />}
    </div>
  );
}
