"use client";

import { Plus } from "lucide-react";
import type { RedacteurClient } from "./types";

interface ClientSelectorProps {
  clients: RedacteurClient[];
  onSelect: (client: RedacteurClient) => void;
  onShowMore: () => void;
  onNew: () => void;
}

export function ClientSelector({
  clients,
  onSelect,
  onShowMore,
  onNew,
}: ClientSelectorProps) {
  return (
    <div className="mt-2 space-y-2">
      {clients.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Récents
          </p>
          <div className="grid gap-2">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelect(client)}
                className="flex flex-col items-start rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left transition-colors hover:border-[#534AB7] hover:bg-[#EEEDFE]"
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
            ))}
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {clients.length > 0 && (
          <button
            type="button"
            onClick={onShowMore}
            className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Afficher plus
          </button>
        )}
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-lg bg-[#534AB7] px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#3C3489]"
        >
          <Plus className="h-3 w-3" />
          Nouveau client
        </button>
      </div>
    </div>
  );
}
