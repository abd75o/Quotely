import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Carte « document » Quovi (devis ou facture), pleine largeur, look liste premium.
// Purement présentationnelle (aucun hook) → utilisable côté serveur ET client.
// La carte entière est cliquable (→ page détail) ; un éventuel `trailing`
// interactif (menu ⋯) gère lui-même son stopPropagation pour ne pas naviguer.
export interface DocumentCardProps {
  href: string;
  icon: React.ElementType;
  /** Numéro affiché en mono (QVI-… / FAC-…). */
  number: string;
  /** Titre principal : nom du client. */
  title: string;
  /** Sous-titre discret : date, ou « type · date ». */
  subtitle?: React.ReactNode;
  /** Montant déjà formaté (ex. « 2 340,00 € »). */
  amount: string;
  /** Badge de statut (élément déjà stylé). */
  badge: React.ReactNode;
  /** Slot droite (menu ⋯ pour les devis) ; sinon un chevron « ouvrir ». */
  trailing?: React.ReactNode;
}

export function DocumentCard({
  href,
  icon: Icon,
  number,
  title,
  subtitle,
  amount,
  badge,
  trailing,
}: DocumentCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5",
        "transition-all duration-150 hover:border-[var(--primary)]/30 hover:shadow-sm",
      )}
    >
      {/* Ligne 1 : chip + numéro · badge */}
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary-bg)]">
            <Icon className="h-4 w-4 text-[var(--primary)]" />
          </span>
          <span className="truncate font-mono text-xs font-semibold text-[var(--text-muted)]">
            {number}
          </span>
        </div>
        {badge}
      </div>

      {/* Ligne 2 : nom client · (menu ⋯ ou chevron) */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-bold text-[var(--text-primary)]">
          {title}
        </p>
        {trailing ?? (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--primary)]" />
        )}
      </div>

      {/* Ligne 3 : sous-titre (date / type) · montant */}
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-[var(--text-muted)]">
          {subtitle}
        </p>
        <p className="flex-shrink-0 text-base font-bold tabular-nums text-[var(--text-primary)]">
          {amount}
        </p>
      </div>
    </Link>
  );
}
