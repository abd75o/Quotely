import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TopClient } from "@/lib/stats/calculations";

interface Props {
  clients: TopClient[];
}

export function TopClientsList({ clients }: Props) {
  return (
    <section
      className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-[var(--shadow-sm)]"
      aria-label="Top 5 clients"
    >
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Top 5 clients</h3>
        <span className="text-xs text-[var(--text-muted)]">par CA signé</span>
      </header>
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Pas encore de top clients"
          description="Vos meilleurs clients apparaîtront ici dès qu'un devis est signé."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {clients.map((c, i) => (
            <li key={c.clientId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-6 h-6 rounded-full bg-[var(--surface)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {c.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {c.quotesCount} devis
                </p>
              </div>
              <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                {c.totalRevenue.toLocaleString("fr-FR")} €
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
