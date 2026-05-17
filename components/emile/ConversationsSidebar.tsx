"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { useConversations } from "@/hooks/useEmile";
import { ConversationItem } from "./ConversationItem";

interface ConversationsSidebarProps {
  activeConversationId?: string;
}

export function ConversationsSidebar({
  activeConversationId,
}: ConversationsSidebarProps) {
  const router = useRouter();
  const {
    conversations,
    isLoading,
    rename,
    archive,
    unarchive,
    remove,
  } = useConversations();

  const [query, setQuery] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      (c.title ?? "").toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const active = filtered.filter((c) => c.status === "active");
  const archived = filtered.filter((c) => c.status === "archived");

  async function handleNew() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          conversation: { id: string };
        };
        router.push(`/dashboard/emile/${json.conversation.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-[var(--border)] bg-white">
      <div className="space-y-2 border-b border-[var(--border)] p-3">
        <button
          type="button"
          onClick={handleNew}
          disabled={creating}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {creating ? "Création…" : "Nouveau devis"}
        </button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="h-8 w-full rounded-lg border border-[var(--border)] bg-gray-50 pl-8 pr-3 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading && conversations.length === 0 ? (
          <p className="px-2 py-4 text-center text-[12px] text-[var(--text-muted)]">
            Chargement…
          </p>
        ) : (
          <>
            <SectionLabel>Actives</SectionLabel>
            {active.length === 0 ? (
              <p className="px-2 py-3 text-[12px] text-[var(--text-muted)]">
                Aucune conversation.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {active.map((conv) => (
                  <li key={conv.id}>
                    <ConversationItem
                      conversation={conv}
                      active={conv.id === activeConversationId}
                      onRename={rename}
                      onArchive={archive}
                      onUnarchive={unarchive}
                      onDelete={remove}
                    />
                  </li>
                ))}
              </ul>
            )}

            {archived.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setArchivedOpen((v) => !v)}
                  className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {archivedOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Archivées ({archived.length})
                </button>
                {archivedOpen && (
                  <ul className="space-y-0.5">
                    {archived.map((conv) => (
                      <li key={conv.id}>
                        <ConversationItem
                          conversation={conv}
                          active={conv.id === activeConversationId}
                          onRename={rename}
                          onArchive={archive}
                          onUnarchive={unarchive}
                          onDelete={remove}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
      {children}
    </p>
  );
}
