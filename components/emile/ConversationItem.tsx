"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/hooks/useEmile";

interface ConversationItemProps {
  conversation: ConversationSummary;
  active?: boolean;
  onRename: (id: string, title: string) => Promise<boolean> | boolean;
  onArchive: (id: string) => Promise<boolean> | boolean;
  onUnarchive: (id: string) => Promise<boolean> | boolean;
  onDelete: (id: string) => Promise<boolean> | boolean;
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `il y a ${d}j`;
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

export function ConversationItem({
  conversation,
  active = false,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
}: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(conversation.title ?? "");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  const title = conversation.title?.trim() || "Nouvelle conversation";
  const subtitle = relativeTime(conversation.updated_at);
  const isArchived = conversation.status === "archived";

  return (
    <div
      className={cn(
        "group relative rounded-xl transition-colors",
        // When the menu is open, lift the whole item above later siblings —
        // the inner `translate` wrapper creates a stacking context, so a
        // z-index on the menu alone can't escape it.
        menuOpen ? "z-50" : "z-0",
        active
          ? "border-l-4 border-[var(--primary)] bg-[var(--primary-bg)]"
          : "hover:bg-[var(--surface)]",
      )}
    >
      {renaming ? (
        <div className="flex items-center gap-1 px-2 py-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = draft.trim();
                if (v && v !== conversation.title) {
                  void onRename(conversation.id, v);
                }
                setRenaming(false);
              } else if (e.key === "Escape") {
                setDraft(conversation.title ?? "");
                setRenaming(false);
              }
            }}
            className="h-7 flex-1 rounded-md border border-[var(--primary)] bg-white px-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      ) : (
        <Link
          href={`/dashboard/emile/${conversation.id}`}
          className="flex flex-col gap-0.5 px-3 py-2"
        >
          <span
            className={cn(
              "truncate text-[13px]",
              active
                ? "font-semibold text-[var(--primary)]"
                : "font-medium text-[var(--text-primary)]",
            )}
          >
            {title}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {subtitle}
          </span>
        </Link>
      )}

      {!renaming && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Options"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-white hover:text-[var(--text-primary)] group-hover:opacity-100 data-[open=true]:opacity-100"
            data-open={menuOpen}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-[var(--border)] bg-white p-1 shadow-xl"
            >
              <MenuItem
                icon={Pencil}
                label="Renommer"
                onClick={() => {
                  setDraft(conversation.title ?? "");
                  setRenaming(true);
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={Archive}
                label={isArchived ? "Désarchiver" : "Archiver"}
                onClick={() => {
                  void (isArchived
                    ? onUnarchive(conversation.id)
                    : onArchive(conversation.id));
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={Trash2}
                label="Supprimer"
                danger
                onClick={() => {
                  if (confirm("Supprimer cette conversation ?")) {
                    void onDelete(conversation.id);
                  }
                  setMenuOpen(false);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-[var(--text-primary)] hover:bg-[var(--surface)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
