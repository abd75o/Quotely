"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "indigo" | "emerald" | "amber" | "violet";

const TONE_CONFIG: Record<
  Tone,
  { icon: string; stroke: string; fillId: string }
> = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600",
    stroke: "#6366F1",
    fillId: "spark-indigo",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    stroke: "#10B981",
    fillId: "spark-emerald",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    stroke: "#F59E0B",
    fillId: "spark-amber",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    stroke: "#8B5CF6",
    fillId: "spark-violet",
  },
};

interface StatCardWithSparklineProps {
  label: string;
  value: string;
  subtitle?: string;
  /** Percentage variation vs previous month. `null` = no previous data (hidden). */
  deltaPercent: number | null;
  /** Series for the sparkline, oldest → newest. */
  sparkline: number[];
  tone?: Tone;
  icon: React.ElementType;
  className?: string;
}

export function StatCardWithSparkline({
  label,
  value,
  subtitle,
  deltaPercent,
  sparkline,
  tone = "indigo",
  icon: Icon,
  className,
}: StatCardWithSparklineProps) {
  const cfg = TONE_CONFIG[tone];

  // Recharts wants `Array<{ value: number }>` — convert once.
  const data = useMemo(
    () => sparkline.map((v, i) => ({ i, value: v })),
    [sparkline],
  );
  const hasData = useMemo(
    () => sparkline.some((v) => v > 0),
    [sparkline],
  );

  // Y-axis bounds: extend a touch above the max so the line never kisses the
  // top edge; keep the floor at 0 so flat-zero series don't look noisy.
  const yMax = useMemo(() => {
    const max = sparkline.reduce((m, v) => (v > m ? v : m), 0);
    return max > 0 ? max * 1.25 : 1;
  }, [sparkline]);

  const Delta = () => {
    if (deltaPercent === null) return null;
    if (deltaPercent === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          <Minus className="h-3 w-3" />
          0 %
        </span>
      );
    }
    const positive = deltaPercent > 0;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          positive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-700",
        )}
      >
        {positive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {positive ? "+" : ""}
        {deltaPercent} %
      </span>
    );
  };

  return (
    <article
      className={cn(
        "dashboard-card flex flex-col gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {label}
          </p>
          <p className="mt-1 font-fraunces text-3xl font-extrabold leading-none text-[var(--text-primary)] tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
            cfg.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Delta />
        <div className="-mb-1 -mr-1 h-12 w-24 sm:w-32" aria-hidden>
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={cfg.fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cfg.stroke} stopOpacity={0.3} />
                    <stop
                      offset="100%"
                      stopColor={cfg.stroke}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[0, yMax]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={cfg.stroke}
                  strokeWidth={2}
                  fill={`url(#${cfg.fillId})`}
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-end">
              <span className="block h-px w-full bg-gray-200" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
