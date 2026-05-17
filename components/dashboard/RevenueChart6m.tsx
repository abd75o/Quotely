"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenuePoint {
  month: string;
  value: number;
}

interface RevenueChart6mProps {
  data: RevenuePoint[];
  className?: string;
}

function fmtCompactEuro(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k €`;
  return `${n} €`;
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold capitalize text-[var(--text-primary)]">
        {label}
      </p>
      <p className="mt-0.5 font-bold text-[var(--primary)] tabular-nums">
        {v.toLocaleString("fr-FR")} €
      </p>
    </div>
  );
}

export function RevenueChart6m({ data, className }: RevenueChart6mProps) {
  const total = useMemo(
    () => data.reduce((s, p) => s + p.value, 0),
    [data],
  );
  const isEmpty = total === 0;

  return (
    <section
      className={cn(
        "dashboard-card flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
      aria-label="Chiffre d'affaires des 6 derniers mois"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
            Chiffre d&apos;affaires
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            Devis signés sur les 6 derniers mois
          </p>
        </div>
        {!isEmpty && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Total
            </p>
            <p className="font-fraunces text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
              {total.toLocaleString("fr-FR")} €
            </p>
          </div>
        )}
      </header>

      <div className="h-56 flex-1 sm:h-64">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)]">
              <TrendingUp className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Tes premiers devis arriveront ici
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              Dès qu&apos;un client signe, le montant s&apos;ajoute
              automatiquement.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenue6mFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtCompactEuro}
                width={48}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: "#6366F1",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366F1"
                strokeWidth={2.5}
                fill="url(#revenue6mFill)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
