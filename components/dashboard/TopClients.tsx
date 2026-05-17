import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopClient {
  id: string;
  name: string;
  quoteCount: number;
  revenue: number;
}

interface TopClientsProps {
  clients: TopClient[];
  className?: string;
}

// Stable hash for the avatar tint so the same client always gets the same color.
const AVATAR_PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export function TopClients({ clients, className }: TopClientsProps) {
  return (
    <section
      className={cn(
        "dashboard-card flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
      aria-label="Top clients"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Users className="h-4 w-4 text-[var(--primary)]" />
            Top clients
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            Classés par chiffre d&apos;affaires signé
          </p>
        </div>
        {clients.length > 0 && (
          <Link
            href="/dashboard/clients"
            className="text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            Voir tout
          </Link>
        )}
      </header>

      {clients.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)]">
            <Users className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Pas encore de client
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            Tes 5 clients les plus actifs apparaîtront ici.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/clients`}
                className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--surface)]"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                    colorFor(c.id),
                  )}
                  aria-hidden
                >
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {c.quoteCount} devis
                  </p>
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {c.revenue > 0
                    ? `${c.revenue.toLocaleString("fr-FR")} €`
                    : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
