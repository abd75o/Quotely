/**
 * Canonical list of quote-line units. Used by:
 *   - NewQuoteLineModal (Émile add-line)
 *   - QuotePreview / QuoteFullscreen inline edit
 *   - bulk-import normalisation (eventually)
 *
 * Stored verbatim in `quotes.items[].unite` (JSONB), surfaced on the PDF
 * by lib/pdf/quote-template.tsx LineItemsTable.cellUnit.
 *
 * `""` (empty) is included so the artisan can clear the unit when none
 * applies (e.g. a free-form deliverable). The label "—" marks that case
 * visually in the dropdown.
 */
export interface QuoteUnit {
  /** Stored in DB. */
  value: string;
  /** Shown in the dropdown. Most labels match `value`; exceptions: pieces
   *  + ensemble use a more readable French label. */
  label: string;
}

export const QUOTE_UNITS: ReadonlyArray<QuoteUnit> = [
  { value: "", label: "—" },
  { value: "u", label: "u (unité)" },
  { value: "m²", label: "m²" },
  { value: "m³", label: "m³" },
  { value: "ml", label: "ml" },
  { value: "m linéaire", label: "m linéaire" },
  { value: "h", label: "h" },
  { value: "jour", label: "jour" },
  { value: "semaine", label: "semaine" },
  { value: "forfait", label: "forfait" },
  { value: "kg", label: "kg" },
  { value: "L", label: "L" },
  { value: "point(s)", label: "point(s)" },
  { value: "ens.", label: "ens. (ensemble)" },
];

/**
 * Returns the canonical list plus the artisan's existing value if it
 * doesn't match the canonical set — keeps backward compat with rows
 * created before the dropdown existed (e.g. "pcs", "pièces", "tomettes")
 * without losing those values silently when the row is re-edited.
 */
export function quoteUnitsWithCurrent(
  current: string | null | undefined,
): ReadonlyArray<QuoteUnit> {
  if (!current) return QUOTE_UNITS;
  const trimmed = current.trim();
  if (!trimmed) return QUOTE_UNITS;
  if (QUOTE_UNITS.some((u) => u.value === trimmed)) return QUOTE_UNITS;
  return [...QUOTE_UNITS, { value: trimmed, label: `${trimmed} (ancien)` }];
}
