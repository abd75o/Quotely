import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TopPrestation } from "@/lib/stats/calculations";

interface Props {
  prestations: TopPrestation[];
}

export function TopPrestationsList({ prestations }: Props) {
  return (
    <section
      className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-[var(--shadow-sm)]"
      aria-label="Top 5 prestations"
    >
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Top 5 prestations</h3>
        <span className="text-xs text-[var(--text-muted)]">par fréquence</span>
      </header>
      {prestations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Pas encore de prestations"
          description="Les prestations que vous facturez le plus apparaîtront ici."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {prestations.map((p) => (
            <li key={p.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {p.label}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {p.count} fois · ~{p.avgPrice.toLocaleString("fr-FR")} €/unité
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums bg-[var(--surface)] px-2 py-1 rounded-lg">
                ×{p.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
