import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

export type StatTileColor = "indigo" | "emerald" | "amber" | "violet" | "rose" | "sky";

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  color?: StatTileColor;
  className?: string;
}

const COLORS: Record<StatTileColor, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
};

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  color = "indigo",
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            COLORS[color]
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] leading-none tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}
