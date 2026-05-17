"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FilePlus2,
  FileText,
  Receipt,
  UserPlus,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEntry, ActivityType } from "@/lib/dashboard/data";

interface ActivityFeedProps {
  entries: ActivityEntry[];
  className?: string;
}

const TYPE_CONFIG: Record<
  ActivityType,
  { icon: React.ElementType; tone: string }
> = {
  quote_created: {
    icon: FilePlus2,
    tone: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  quote_signed: {
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  quote_refused: {
    icon: XCircle,
    tone: "bg-red-50 text-red-600 ring-red-100",
  },
  quote_invoiced: {
    icon: Receipt,
    tone: "bg-violet-50 text-violet-600 ring-violet-100",
  },
  client_created: {
    icon: UserPlus,
    tone: "bg-amber-50 text-amber-600 ring-amber-100",
  },
};

/**
 * "il y a 2 h" style label. Recomputed on the client (so SSR doesn't bake a
 * label that becomes stale by the time the page is interactive) but we hold a
 * stable fallback for the first paint to keep markup identical.
 */
function relativeAgo(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, nowMs - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function ActivityFeed({ entries, className }: ActivityFeedProps) {
  // We only tick `now` once on mount — the relative labels don't need to be
  // live (a feed item from 3 hours ago doesn't need to flip to "3 h 1 min").
  // This keeps SSR markup identical to first client paint.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  return (
    <section
      className={cn(
        "dashboard-card rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
      aria-label="Activité récente"
    >
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Activity className="h-4 w-4 text-[var(--primary)]" />
          Activité récente
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
          Les 10 derniers événements de ton compte
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)]">
            <Activity className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Rien à signaler pour le moment
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            Crée ton premier devis pour voir ton activité ici.
          </p>
        </div>
      ) : (
        <ol className="relative flex flex-col">
          {entries.map((entry, idx) => {
            const cfg = TYPE_CONFIG[entry.type];
            const Icon = cfg.icon;
            const isLast = idx === entries.length - 1;
            const ago = now ? relativeAgo(entry.date, now) : "";
            return (
              <li key={entry.id} className="relative flex gap-3 pb-3 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[18px] top-9 h-[calc(100%-1rem)] w-px bg-[var(--border)]"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                    cfg.tone,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <ActivityRow entry={entry} ago={ago} />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ActivityRow({ entry, ago }: { entry: ActivityEntry; ago: string }) {
  const body = (
    <div className="min-w-0 flex-1 rounded-xl px-2 py-1 transition-colors group-hover:bg-[var(--surface)]">
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {entry.label}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{ago}</p>
    </div>
  );
  if (!entry.href) {
    return <div className="group flex min-w-0 flex-1">{body}</div>;
  }
  return (
    <Link
      href={entry.href}
      className="group flex min-w-0 flex-1 items-center"
    >
      {body}
      <span
        aria-hidden
        className="ml-2 hidden flex-shrink-0 text-xs text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 sm:inline"
      >
        <FileText className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
