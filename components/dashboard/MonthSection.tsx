// En-tête de section « Mois Année » + cartes empilées (1 colonne pleine largeur).
// Présentationnel (aucun hook) → utilisable côté serveur et client. Le titre du
// mois est en font-display (Fraunces), la typo serif des titres Quovi.
export function MonthSection({
  label,
  count,
  children,
}: {
  label: string;
  /** Nombre d'éléments du mois (compteur discret à droite). */
  count: number;
  /** Les <DocumentCard> du mois. */
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-[var(--border-light)] pb-2">
        <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {label}
        </h2>
        <span className="flex-shrink-0 text-xs text-[var(--text-muted)]">
          {count} {count > 1 ? "éléments" : "élément"}
        </span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
