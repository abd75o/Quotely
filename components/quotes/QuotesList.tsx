"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  MoreHorizontal,
  Copy,
  Trash2,
} from "lucide-react";
import { StatsCards } from "./StatsCards";
import { cn } from "@/lib/utils";

type Status = "all" | "pending" | "signed" | "refused" | "invoiced";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteRow {
  id: string;
  number: string;
  status: string;
  total: number;
  public_token: string;
  created_at: string;
  valid_until: string;
  items: QuoteItem[];
  client?: { name: string; email: string } | null;
}

const STATUS_CONFIG = {
  pending: { label: "En attente", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  signed: { label: "Signé", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  refused: { label: "Refusé", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
  invoiced: { label: "Facturé", icon: CheckCircle2, color: "text-violet-600 bg-violet-50 border-violet-200" },
} as const;

const TABS: { label: string; value: Status }[] = [
  { label: "Tous", value: "all" },
  { label: "En attente", value: "pending" },
  { label: "Signés", value: "signed" },
  { label: "Refusés", value: "refused" },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", cfg.color)}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function QuoteRowMenu({ quote }: { quote: QuoteRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-gray-100 cursor-pointer transition-colors"
        aria-label="Options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-[var(--border)] rounded-xl shadow-xl py-1 overflow-hidden">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/devis/${quote.public_token}`);
                setOpen(false);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copier le lien
            </button>
            <Link
              href={`/dashboard/quotes/${quote.id}`}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Envoyer au client
            </Link>
            <div className="border-t border-[var(--border)] my-1" />
            <button
              type="button"
              onClick={() => {
                if (confirm("Supprimer ce devis ?")) {
                  fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
                }
                setOpen(false);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function QuotesList({ initialQuotes }: { initialQuotes: QuoteRow[] }) {
  const [activeTab, setActiveTab] = useState<Status>("all");
  const [search, setSearch] = useState("");

  const filtered = initialQuotes.filter((q) => {
    const matchTab = activeTab === "all" || q.status === activeTab;
    const matchSearch =
      !search ||
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.client?.name.toLowerCase().includes(search.toLowerCase()) ||
      false;
    return matchTab && matchSearch;
  });

  // Stats
  const total = initialQuotes.length;
  const signed = initialQuotes.filter((q) => q.status === "signed").length;
  const pending = initialQuotes.filter((q) => q.status === "pending").length;
  const revenue = initialQuotes
    .filter((q) => q.status === "signed" || q.status === "invoiced")
    .reduce((s, q) => s + q.total, 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] truncate">Mes devis</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 truncate">{total} devis au total</p>
        </div>
        {/* Sur mobile, le bouton "+" est dans le header sticky du dashboard */}
        <Link
          href="/dashboard/quotes/new"
          className="hidden lg:flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau devis
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <StatsCards total={total} signed={signed} pending={pending} revenue={revenue} />
      </div>

      {/* Filters — sur mobile la recherche est au-dessus des onglets */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 mb-4">
        {/* Tabs — scroll horizontal sur mobile pour ne pas casser le layout */}
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="inline-flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl whitespace-nowrap">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer flex-shrink-0",
                  activeTab === tab.value
                    ? "bg-white shadow-sm text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {tab.label}
                {tab.value === "pending" && pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                    {pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-xl hover:border-gray-300 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition-all">
          <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un devis ou client…"
            aria-label="Rechercher"
            className="flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-[var(--border)]">
          <div className="w-14 h-14 bg-[var(--surface)] rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-semibold text-[var(--text-primary)] mb-1">
            {search ? "Aucun résultat" : "Aucun devis"}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            {search ? "Essayez avec d'autres termes" : "Créez votre premier devis en 30 secondes"}
          </p>
          {!search && (
            <Link
              href="/dashboard/quotes/new"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau devis
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile : liste de cartes */}
          <ul className="md:hidden flex flex-col gap-3">
            {filtered.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/dashboard/quotes/${quote.id}`}
                  className="block bg-white rounded-2xl border border-[var(--border)] p-4 hover:border-[var(--primary)]/30 hover:shadow-sm cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[var(--primary-bg)] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-muted)] font-mono truncate">
                        {quote.number}
                      </p>
                    </div>
                    <StatusBadge status={quote.status} />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate mb-1">
                    {quote.client?.name ?? "—"}
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums leading-none">
                      {quote.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] flex-shrink-0">
                      {fmtDate(quote.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop : table classique */}
          <div className="hidden md:block bg-white rounded-3xl border border-[var(--border)] overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_120px_140px_100px_40px] gap-4 px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
              {["Devis", "Client", "Montant TTC", "Date", "Statut", ""].map((h) => (
                <span key={h} className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {h}
                </span>
              ))}
            </div>

            <ul className="divide-y divide-[var(--border-light)]">
              {filtered.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/dashboard/quotes/${quote.id}`}
                    className="grid grid-cols-[1fr_160px_120px_140px_100px_40px] gap-4 items-center px-6 py-4 hover:bg-[var(--surface)] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[var(--primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">{quote.number}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {quote.items?.[0]?.description || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{quote.client?.name ?? "—"}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{quote.client?.email ?? ""}</p>
                    </div>

                    <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {quote.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </p>

                    <p className="text-sm text-[var(--text-secondary)]">
                      {fmtDate(quote.created_at)}
                    </p>

                    <div>
                      <StatusBadge status={quote.status} />
                    </div>

                    <div onClick={(e) => e.preventDefault()} className="flex justify-end">
                      <QuoteRowMenu quote={quote} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
