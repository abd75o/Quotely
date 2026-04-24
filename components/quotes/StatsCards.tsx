"use client";

import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

export function StatsCards({
  total = 0,
  signed = 0,
  pending = 0,
  revenue = 0,
}: {
  total?: number;
  signed?: number;
  pending?: number;
  revenue?: number;
}) {
  const signRate = total > 0 ? Math.round((signed / total) * 100) : 0;

  const stats: Stat[] = [
    {
      label: "Total devis",
      value: String(total),
      sub: "Ce mois-ci",
      icon: FileText,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--primary-bg)]",
    },
    {
      label: "Signés",
      value: String(signed),
      sub: `${signRate}% de taux de signature`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "En attente",
      value: String(pending),
      sub: "À relancer",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "CA signé",
      value: revenue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
      sub: "Montant total signé",
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-2xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-4.5 h-4.5", stat.color)} />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)] mb-0.5 tabular-nums">
            {stat.value}
          </p>
          <p className="text-xs font-semibold text-[var(--text-secondary)]">{stat.label}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}
