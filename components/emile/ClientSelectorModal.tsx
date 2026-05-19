"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExistingClient {
  id: string;
  name: string;
  first_name?: string | null;
  email: string | null;
  phone?: string | null;
}

function fullClientName(c: ExistingClient): string {
  return (
    [c.first_name, c.name].filter(Boolean).join(" ").trim() || c.name
  );
}

interface ClientSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (client: ExistingClient) => void;
}

interface ClientsResponse {
  clients: ExistingClient[];
}

export function ClientSelectorModal({
  open,
  onClose,
  onSelect,
}: ClientSelectorModalProps) {
  const [clients, setClients] = useState<ExistingClient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch once per open. The list is small enough to filter client-side.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQuery("");
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ClientsResponse;
        if (!cancelled) setClients(json.clients ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? "Erreur réseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.first_name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [clients, query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choisir un client existant"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-4">
          <div>
            <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">
              Choisir un client
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Sélectionne un client existant.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-[var(--border)] bg-white px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-gray-50 pl-9 pr-3 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="px-5 py-6 text-center text-[13px] text-red-600">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-[var(--text-muted)]">
              {query ? "Aucun résultat." : "Aucun client enregistré."}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {filtered.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(client)}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors",
                      "hover:bg-[var(--surface)]",
                    )}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-bg)] text-[var(--primary)]">
                      <UserCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                        {fullClientName(client)}
                      </p>
                      {client.email && (
                        <p className="truncate text-[12px] text-[var(--text-secondary)]">
                          {client.email}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
