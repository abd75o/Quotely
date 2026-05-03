"use client";

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Recharts est lourd → lazy-load. La page dashboard est server-rendered,
// le chart n'est téléchargé que pour les utilisateurs Pro qui voient cette section.
const ChartArea = lazy(() => import("./RevenueChartArea"));

type Range = "7d" | "30d" | "90d" | "12m";

const RANGES: { value: Range; label: string; days: number }[] = [
  { value: "7d", label: "7 jours", days: 7 },
  { value: "30d", label: "30 jours", days: 30 },
  { value: "90d", label: "90 jours", days: 90 },
  { value: "12m", label: "12 mois", days: 365 },
];

export interface RevenuePoint {
  date: string; // ISO YYYY-MM-DD
  label: string; // libellé court pour l'axe X
  value: number; // CA TTC du jour/mois en €
}

interface RawQuote {
  total: number | null;
  signed_at: string | null;
  invoiced_at: string | null;
  status: string | null;
  created_at: string;
}

function bucketize(quotes: RawQuote[], range: Range): RevenuePoint[] {
  const cfg = RANGES.find((r) => r.value === range)!;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - cfg.days + 1);

  if (range === "12m") {
    // Buckets mensuels
    const buckets: { key: string; label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: d.toLocaleDateString("fr-FR", { month: "short" }),
        value: 0,
      });
    }
    for (const q of quotes) {
      const ref = q.signed_at ?? q.invoiced_at;
      if (!ref) continue;
      const d = new Date(ref);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.find((b) => b.key === key);
      if (b) b.value += Number(q.total ?? 0);
    }
    return buckets.map((b) => ({ date: `${b.key}-01`, label: b.label, value: Math.round(b.value) }));
  }

  // Buckets journaliers
  const buckets: { key: string; label: string; value: number }[] = [];
  const labelFmt: Intl.DateTimeFormatOptions =
    cfg.days <= 30 ? { day: "numeric", month: "short" } : { day: "2-digit", month: "2-digit" };
  for (let i = 0; i < cfg.days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      key,
      label: d.toLocaleDateString("fr-FR", labelFmt),
      value: 0,
    });
  }
  for (const q of quotes) {
    const ref = q.signed_at ?? q.invoiced_at;
    if (!ref) continue;
    const key = new Date(ref).toISOString().slice(0, 10);
    const b = buckets.find((b) => b.key === key);
    if (b) b.value += Number(q.total ?? 0);
  }
  return buckets.map((b) => ({ date: b.key, label: b.label, value: Math.round(b.value) }));
}

export function RevenueChart({ className }: { className?: string }) {
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<RawQuote[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setQuotes([]);
            setLoading(false);
          }
          return;
        }
        const sinceIso = new Date(Date.now() - 380 * 86400_000).toISOString();
        const { data, error: qErr } = await supabase
          .from("quotes")
          .select("total, signed_at, invoiced_at, status, created_at")
          .eq("user_id", user.id)
          .or(`signed_at.gte.${sinceIso},invoiced_at.gte.${sinceIso}`)
          .limit(1000);
        if (qErr) throw qErr;
        if (!cancelled) setQuotes((data ?? []) as RawQuote[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => bucketize(quotes, range), [quotes, range]);
  const total = useMemo(() => data.reduce((s, p) => s + p.value, 0), [data]);
  const isEmpty = total === 0;

  return (
    <section
      className={cn(
        "bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 shadow-sm",
        className
      )}
      aria-label="Évolution du chiffre d'affaires"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
            Évolution de mon chiffre d&apos;affaires
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Total période :{" "}
            <span className="font-semibold text-[var(--text-primary)] tabular-nums">
              {total.toLocaleString("fr-FR")} €
            </span>
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Période d'affichage"
          className="inline-flex p-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl whitespace-nowrap self-start"
        >
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="tab"
              aria-selected={range === r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                range === r.value
                  ? "bg-white shadow-sm text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 sm:h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
            Impossible de charger l&apos;historique.
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Pas encore de chiffre d&apos;affaires sur cette période
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Vos devis signés et facturés apparaîtront ici.
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
            <ChartArea data={data} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
