import { Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/stats/calculations";

interface Props {
  insights: Insight[];
}

export function InsightsCard({ insights }: Props) {
  return (
    <section
      className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-[var(--shadow-sm)]"
      aria-label="Insights"
    >
      <header className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Insights Quovi</h3>
      </header>
      {insights.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Vos insights personnalisés s&apos;affichent dès que vous avez quelques devis signés.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((i, idx) => (
            <li
              key={idx}
              className="rounded-xl bg-[var(--surface)] border border-[var(--border-light)] p-4"
            >
              <p className="text-base mb-1" aria-hidden>
                {i.icon}
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-snug">{i.label}</p>
              <p className="text-sm font-extrabold text-[var(--text-primary)] mt-1">
                {i.value}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
