"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  User2,
  X,
} from "lucide-react";
import { LockedFeature } from "@/components/shared/LockedFeature";
import { NewQuoteButton } from "@/components/quotes/NewQuoteButton";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  listQuotesForClient,
  computeClientPanelStats,
  type ClientRow,
  type ClientQuoteRow,
} from "@/lib/clients/queries";
import { PLAN_FEATURES } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  client: ClientRow | null;
  onClose: () => void;
  onEdit: () => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  signed: { label: "Signé", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  refused: { label: "Refusé", cls: "bg-red-50 text-red-700 border-red-200" },
  invoiced: { label: "Facturé", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  draft: { label: "Brouillon", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

function fullName(c: ClientRow): string {
  return [c.first_name, c.name].filter(Boolean).join(" ") || c.email || "Client";
}

function initials(c: ClientRow): string {
  const fn = c.first_name?.trim() ?? "";
  const ln = c.name?.trim() ?? "";
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  if (ln) return ln.slice(0, 2).toUpperCase();
  return c.email?.slice(0, 2).toUpperCase() ?? "?";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ClientDetailPanel({ open, client, onClose, onEdit }: Props) {
  const { isPro } = useUserPlan();
  const [quotes, setQuotes] = useState<ClientQuoteRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const rows = await listQuotesForClient(supabase, user.id, client.id);
        if (!cancelled) setQuotes(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, client]);

  if (!open || !client) return null;

  const stats = computeClientPanelStats(quotes);
  const historyDays = PLAN_FEATURES.free.historyLimitDays;
  const cutoff = Date.now() - historyDays * 86_400_000;
  const recentQuotes = isPro
    ? quotes
    : quotes.filter((q) => new Date(q.created_at).getTime() >= cutoff);
  const hiddenCount = quotes.length - recentQuotes.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-detail-title"
      className="fixed inset-0 z-[90] flex items-stretch justify-end"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="relative w-full sm:w-[480px] bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[var(--border)] px-5 py-4 flex items-center justify-between gap-3">
          <h2 id="client-detail-title" className="text-base font-extrabold text-[var(--text-primary)] truncate">
            Fiche client
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-6">
          {/* Identity */}
          <section className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0">
              {initials(client)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] truncate">
                {fullName(client)}
              </h3>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mt-0.5">
                {client.type_client === "professionnel" ? (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Professionnel
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <User2 className="w-3 h-3" /> Particulier
                  </span>
                )}
              </p>
              {isPro && client.tags && client.tags.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {client.tags.map((t) => (
                    <li
                      key={t}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-gray-50 rounded-lg cursor-pointer transition-colors flex-shrink-0"
            >
              <Pencil className="w-3 h-3" />
              Modifier
            </button>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2 text-sm">
            {client.email && (
              <Row icon={Mail} value={client.email} link={`mailto:${client.email}`} />
            )}
            {client.phone && <Row icon={Phone} value={client.phone} link={`tel:${client.phone}`} />}
            {(client.address || client.city) && (
              <Row
                icon={MapPin}
                value={[client.address, client.postal_code, client.city]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
            {client.siret && client.type_client === "professionnel" && (
              <Row icon={Building2} value={`SIRET ${client.siret}`} />
            )}
            {client.notes && (
              <p className="text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border)] whitespace-pre-line">
                {client.notes}
              </p>
            )}
          </section>

          {/* Stats */}
          <section>
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
              Statistiques
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <StatCell label="Devis" value={stats.quotesCount} />
              <StatCell label="CA signé" value={`${stats.revenue.toLocaleString("fr-FR")} €`} />
              <StatCell label="Taux signature" value={`${stats.signatureRate}%`} />
              <StatCell
                label="Délai moyen"
                value={stats.avgTimeToSignatureDays !== null ? `${stats.avgTimeToSignatureDays} j` : "—"}
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">
              Dernier devis : {formatDate(stats.lastQuoteAt)}
            </p>
          </section>

          {/* Quotes history */}
          <section>
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
              Historique des devis
            </h4>
            {loading ? (
              <div className="py-6 flex items-center justify-center text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : recentQuotes.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-2">
                Aucun devis pour ce client.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentQuotes.map((q) => {
                  const cfg = STATUS_LABELS[q.status] ?? STATUS_LABELS.draft;
                  return (
                    <li key={q.id}>
                      <Link
                        href={`/dashboard/devis/${q.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--surface)] cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {q.number}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {formatDate(q.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              "hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              cfg.cls
                            )}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {q.total.toLocaleString("fr-FR")} €
                          </span>
                          <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {!isPro && hiddenCount > 0 && (
              <div className="mt-3">
                <LockedFeature
                  feature="historyLimitDays"
                  requiredPlan="starter"
                  variant="replace"
                  teaser={{
                    title: `+ ${hiddenCount} ancien${hiddenCount > 1 ? "s" : ""} devis`,
                    description: `Sur le plan Free, seuls les ${historyDays} derniers jours sont affichés. Passez à Starter pour tout retrouver.`,
                  }}
                >
                  <div />
                </LockedFeature>
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="flex flex-col gap-2">
            <NewQuoteButton
              clientName={
                [client.first_name, client.name].filter(Boolean).join(" ") ||
                client.email ||
                undefined
              }
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau devis pour ce client
            </NewQuoteButton>
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-[var(--surface)] rounded-xl cursor-pointer transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Envoyer un email
              </a>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function Row({
  icon: Icon,
  value,
  link,
}: {
  icon: React.ElementType;
  value: string;
  link?: string;
}) {
  const content = (
    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
      <Icon className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
  if (link)
    return (
      <a href={link} className="block hover:text-[var(--primary)] cursor-pointer transition-colors">
        {content}
      </a>
    );
  return content;
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white border border-[var(--border)] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">{value}</p>
    </div>
  );
}
