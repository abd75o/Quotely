"use client";

import { useState, useEffect, useRef } from "react";
import { Search, User, Plus, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Props {
  value: { type: "existing"; clientId: string; client: Client } | { type: "new"; data: { name: string; email: string; phone: string } } | null;
  onChange: (v: Props["value"]) => void;
}

export function ClientSelector({ value, onChange }: Props) {
  const [mode, setMode] = useState<"select" | "new">("select");
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newData, setNewData] = useState({ name: "", email: "", phone: "" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/clients?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .finally(() => setLoading(false));
  }, [open, query]);

  const selected = value?.type === "existing" ? value.client : null;

  function selectClient(client: Client) {
    onChange({ type: "existing", clientId: client.id, client });
    setOpen(false);
    setQuery("");
  }

  function handleNewChange(field: keyof typeof newData, val: string) {
    const updated = { ...newData, [field]: val };
    setNewData(updated);
    if (updated.name && updated.email) {
      onChange({ type: "new", data: updated });
    }
  }

  function switchToNew() {
    setMode("new");
    setOpen(false);
    onChange(null);
  }

  function switchToSelect() {
    setMode("select");
    setNewData({ name: "", email: "", phone: "" });
    onChange(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-[var(--text-primary)]">Client</label>
        <button
          type="button"
          onClick={mode === "select" ? switchToNew : switchToSelect}
          className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
        >
          {mode === "select" ? "+ Nouveau client" : "← Client existant"}
        </button>
      </div>

      {mode === "select" ? (
        <div className="relative" ref={ref}>
          {/* Trigger */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 bg-white border rounded-xl text-sm transition-all duration-150 cursor-pointer text-left",
              open ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-[var(--border)] hover:border-gray-300"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-[var(--primary-bg)] flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-[var(--primary)]" />
            </div>
            <span className={selected ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"}>
              {selected ? selected.name : "Sélectionner un client…"}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {selected && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(null); }}
                  className="p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
              )}
              <ChevronDown className={cn("w-4 h-4 text-[var(--text-muted)] transition-transform duration-200", open && "rotate-180")} />
            </div>
          </button>

          {selected && (
            <p className="mt-1.5 text-xs text-[var(--text-muted)] px-1">{selected.email}</p>
          )}

          {/* Dropdown */}
          {open && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher…"
                    className="flex-1 bg-transparent text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {/* List */}
              <ul className="max-h-48 overflow-y-auto py-1">
                {loading ? (
                  <li className="px-4 py-3 text-sm text-[var(--text-muted)]">Chargement…</li>
                ) : clients.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[var(--text-muted)]">Aucun client trouvé</li>
                ) : (
                  clients.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectClient(c)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface)] cursor-pointer transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{c.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{c.email}</p>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              {/* Create new */}
              <div className="p-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={switchToNew}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-bg)] rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer un nouveau client
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Nouveau client</p>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newData.name}
              onChange={(e) => handleNewChange("name", e.target.value)}
              placeholder="Marc Dupont"
              className="w-full px-3 py-2.5 text-sm bg-white border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={newData.email}
              onChange={(e) => handleNewChange("email", e.target.value)}
              placeholder="marc@example.fr"
              className="w-full px-3 py-2.5 text-sm bg-white border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Téléphone</label>
            <input
              type="tel"
              value={newData.phone}
              onChange={(e) => handleNewChange("phone", e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full px-3 py-2.5 text-sm bg-white border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
