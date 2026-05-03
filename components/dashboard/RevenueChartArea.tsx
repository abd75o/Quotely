"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenuePoint } from "./RevenueChart";

function fmtEuro(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k €`;
  return `${n} €`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl bg-white border border-[var(--border)] shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="tabular-nums text-[var(--primary)] font-bold mt-0.5">
        {value.toLocaleString("fr-FR")} €
      </p>
    </div>
  );
}

export default function RevenueChartArea({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="#9CA3AF"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis
          stroke="#9CA3AF"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtEuro}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#6366F1", strokeWidth: 1, strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#6366F1"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
          activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
