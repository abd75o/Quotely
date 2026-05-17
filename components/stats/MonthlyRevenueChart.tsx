"use client";

import { lazy, Suspense } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import type { MonthlyRevenuePoint } from "@/lib/stats/calculations";

const ChartArea = lazy(() => import("@/components/dashboard/RevenueChartArea"));

interface Props {
  data: MonthlyRevenuePoint[];
}

export function MonthlyRevenueChart({ data }: Props) {
  const total = data.reduce((s, p) => s + p.revenue, 0);
  const isEmpty = total === 0;
  const points = data.map((p) => ({ date: `${p.month}-01`, label: p.label, value: p.revenue }));

  return (
    <section
      className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-[var(--shadow-sm)]"
      aria-label="Évolution du chiffre d'affaires sur 12 mois"
    >
      <header className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
            Évolution du CA · 12 mois
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Total 12 mois :{" "}
            <span className="font-semibold text-[var(--text-primary)] tabular-nums">
              {total.toLocaleString("fr-FR")} €
            </span>
          </p>
        </div>
      </header>

      <div className="h-64 sm:h-72">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Pas encore de chiffre d&apos;affaires sur 12 mois
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Vos devis signés apparaîtront ici.
            </p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            }
          >
            <ChartArea data={points} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
