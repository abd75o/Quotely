"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { RedacteurClient } from "./types";

interface ClientFullListProps {
  clients: RedacteurClient[];
  onSelect: (client: RedacteurClient) => void;
}

export function ClientFullList({ clients, onSelect }: ClientFullListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = [c.name, c.email ?? "", c.meta ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query]);

  return (
    <div className="mt-2 rounded-xl border border-[var(--border)] bg-white p-3 shadow-sm">
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un client…"
          className="w-full rounded-lg border border-[var(--border)] bg-gray-50 py-1.5 pl-8 pr-3 text-[13px] outline-none focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
            Aucun client trouvé.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-light)]">
            {filtered.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => onSelect(client)}
                  className="flex w-full flex-col items-start px-2 py-2 text-left transition-colors hover:bg-[#EEEDFE]"
                >
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">
                    {client.name}
                  </span>
                  {(client.meta || client.email) && (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {client.meta || client.email}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
