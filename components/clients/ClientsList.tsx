"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search, Users } from "lucide-react";
import { useStartEmileQuote } from "@/lib/emile/use-start-quote";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LockedFeature } from "@/components/shared/LockedFeature";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ClientRow, ClientWithStats } from "@/lib/clients/queries";
import { ClientCard } from "./ClientCard";
import { ClientFormModal } from "./ClientFormModal";
import { ClientDetailPanel } from "./ClientDetailPanel";

type FilterType = "all" | "particulier" | "professionnel";
type SortKey = "recent" | "az" | "revenue";

interface Props {
  initialClients: ClientWithStats[];
}

function fullName(c: ClientRow): string {
  return [c.first_name, c.name].filter(Boolean).join(" ") || c.email || "";
}

function toCsv(rows: ClientWithStats[]): string {
  const header = [
    "nom",
    "prenom",
    "email",
    "telephone",
    "type",
    "adresse",
    "code_postal",
    "ville",
    "siret",
    "tags",
    "nb_devis",
    "ca_signe",
  ].join(",");
  const escape = (s: unknown) => {
    const str = String(s ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };
  const body = rows
    .map((c) =>
      [
        c.name,
        c.first_name ?? "",
        c.email ?? "",
        c.phone ?? "",
        c.type_client ?? "",
        c.address ?? "",
        c.postal_code ?? "",
        c.city ?? "",
        c.siret ?? "",
        (c.tags ?? []).join(" | "),
        c.quotes_count,
        c.total_signed_revenue,
      ]
        .map(escape)
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function ClientsList({ initialClients }: Props) {
  const { startNewQuote } = useStartEmileQuote();
  const { isPro } = useUserPlan();

  const [clients, setClients] = useState<ClientWithStats[]>(initialClients);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [detailClient, setDetailClient] = useState<ClientRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = clients.filter((c) => {
      if (filter !== "all" && c.type_client !== filter) return false;
      if (!q) return true;
      const haystack = [c.name, c.first_name, c.email, c.phone, c.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "az") return fullName(a).localeCompare(fullName(b), "fr");
      if (sort === "revenue") return b.total_signed_revenue - a.total_signed_revenue;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [clients, query, filter, sort]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(c: ClientRow) {
    setEditing(c);
    setFormOpen(true);
  }
  function openDetail(c: ClientRow) {
    setDetailClient(c);
  }

  function handleSaved(saved: ClientRow) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      const enriched: ClientWithStats = {
        ...saved,
        quotes_count: prev[idx]?.quotes_count ?? 0,
        total_signed_revenue: prev[idx]?.total_signed_revenue ?? 0,
        last_quote_at: prev[idx]?.last_quote_at ?? null,
      };
      if (idx === -1) return [enriched, ...prev];
      const next = [...prev];
      next[idx] = enriched;
      return next;
    });
    if (detailClient && detailClient.id === saved.id) setDetailClient(saved);
  }

  async function handleDelete(c: ClientRow) {
    if (!confirm(`Supprimer ${c.name} ? Les devis liés restent intacts (client_id passe à null).`))
      return;
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.from("clients").delete().eq("id", c.id);
      if (error) throw error;
      setClients((prev) => prev.filter((x) => x.id !== c.id));
      if (detailClient?.id === c.id) setDetailClient(null);
      toastSuccess("Client supprimé");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  function handleCreateQuote(c: ClientRow) {
    void startNewQuote({ clientName: fullName(c) });
  }

  function handleExportCsv() {
    if (!isPro) return;
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-quovi-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const count = clients.length;
  const isEmpty = count === 0;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Clients"
        subtitle={
          isEmpty
            ? "Aucun client pour l'instant"
            : `${count} client${count > 1 ? "s" : ""} enregistré${count > 1 ? "s" : ""}`
        }
        actions={
          <>
            {isPro ? (
              <button
                type="button"
                onClick={handleExportCsv}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter CSV
              </button>
            ) : (
              <LockedFeature
                feature="canExportCSV"
                requiredPlan="pro"
                variant="inline"
                teaser={{
                  title: "Export CSV",
                  description: "Téléchargez la liste complète de vos clients en CSV avec le plan Pro.",
                }}
              >
                <span />
              </LockedFeature>
            )}
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau client
            </button>
          </>
        }
      />

      {/* Toolbar — hidden when empty */}
      {!isEmpty && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un client…"
              aria-label="Rechercher"
              className="w-full pl-9 pr-3 h-11 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div
            role="tablist"
            aria-label="Filtrer par type"
            className="inline-flex p-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl whitespace-nowrap"
          >
            {(
              [
                { v: "all", l: "Tous" },
                { v: "particulier", l: "Particuliers" },
                { v: "professionnel", l: "Pros" },
              ] as { v: FilterType; l: string }[]
            ).map((opt) => (
              <button
                key={opt.v}
                role="tab"
                aria-selected={filter === opt.v}
                onClick={() => setFilter(opt.v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  filter === opt.v
                    ? "bg-white shadow-sm text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {opt.l}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Trier"
            className="h-11 px-3 text-sm bg-white border border-[var(--border)] rounded-xl outline-none cursor-pointer focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="recent">Récents</option>
            <option value="az">A → Z</option>
            <option value="revenue">CA décroissant</option>
          </select>
        </div>
      )}

      {isEmpty ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
          <EmptyState
            icon={Users}
            title="Aucun client pour l'instant"
            description="Ajoute ton premier client pour commencer à créer des devis."
            cta={
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Mon premier client
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-12 text-center">
          Aucun client ne correspond à votre recherche.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onView={() => openDetail(c)}
              onEdit={() => openEdit(c)}
              onDelete={() => handleDelete(c)}
              onCreateQuote={() => handleCreateQuote(c)}
            />
          ))}
        </div>
      )}

      <ClientFormModal
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ClientDetailPanel
        open={!!detailClient}
        client={detailClient}
        onClose={() => setDetailClient(null)}
        onEdit={() => {
          if (detailClient) openEdit(detailClient);
        }}
      />
    </div>
  );
}
