"use client";

import { useState } from "react";
import { MoreHorizontal, FileText, Pencil, Trash2, Eye } from "lucide-react";
import type { ClientWithStats } from "@/lib/clients/queries";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { cn } from "@/lib/utils";

interface ClientCardProps {
  client: ClientWithStats;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateQuote: () => void;
}

function initialsOf(client: ClientWithStats): string {
  const fn = client.first_name?.trim() ?? "";
  const ln = client.name?.trim() ?? "";
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  if (ln) return ln.slice(0, 2).toUpperCase();
  if (client.email) return client.email.slice(0, 2).toUpperCase();
  return "?";
}

function fullName(client: ClientWithStats): string {
  const fn = client.first_name?.trim() ?? "";
  const ln = client.name?.trim() ?? "";
  return [fn, ln].filter(Boolean).join(" ") || client.email || "Client";
}

export function ClientCard({
  client,
  onView,
  onEdit,
  onDelete,
  onCreateQuote,
}: ClientCardProps) {
  const { isPro } = useUserPlan();
  const [menuOpen, setMenuOpen] = useState(false);

  const tagsToShow = isPro ? client.tags?.slice(0, 3) ?? [] : [];

  return (
    <article
      className="relative bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 shadow-[var(--shadow-sm)] hover:border-[var(--text-muted)] transition-colors"
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initialsOf(client)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
            {fullName(client)}
          </h3>
          {client.email && (
            <p className="text-xs text-[var(--text-secondary)] truncate">{client.email}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors flex-shrink-0"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-3 top-12 z-20 w-48 bg-white border border-[var(--border)] rounded-xl shadow-lg py-1.5 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem icon={Eye} label="Voir détail" onClick={() => { setMenuOpen(false); onView(); }} />
            <MenuItem icon={Pencil} label="Modifier" onClick={() => { setMenuOpen(false); onEdit(); }} />
            <MenuItem icon={FileText} label="Créer un devis" onClick={() => { setMenuOpen(false); onCreateQuote(); }} />
            <div className="my-1 border-t border-[var(--border)]" />
            <MenuItem
              icon={Trash2}
              label="Supprimer"
              danger
              onClick={() => { setMenuOpen(false); onDelete(); }}
            />
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Devis
          </p>
          <p className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
            {client.quotes_count}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            CA signé
          </p>
          <p className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
            {client.total_signed_revenue.toLocaleString("fr-FR")} €
          </p>
        </div>
      </div>

      {tagsToShow.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tagsToShow.map((t) => (
            <li
              key={t}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer transition-colors",
        danger ? "text-red-600" : "text-[var(--text-primary)]"
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </button>
  );
}
