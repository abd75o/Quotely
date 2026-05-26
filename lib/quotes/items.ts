/**
 * Quote line item canonical shape + normalization.
 *
 * Two shapes coexist in the codebase for historical reasons:
 *  - canonical (Émile / bulk-lines / PDF) ... { id, label, price, quantity, unite, tva }
 *  - legacy   (LineItemsEditor / pre-Émile) { id, description, quantity, unitPrice, total }
 *
 * All persistence paths (POST/PUT /api/quotes, /api/quotes/bulk-lines,
 * saveQuoteDraft tool) call `normalizeQuoteItem()` before writing so the JSONB
 * column always holds the canonical shape — even if a legacy editor still
 * sends `description/unitPrice`. Readers (PDF route, send.ts, devis detail
 * page) only need to handle the canonical shape now, but a back-compat fall-
 * back for `description ?? label` and `unitPrice ?? price` is kept in the
 * detail page so quotes persisted before this normalization render correctly.
 */
export interface QuoteItem {
  id: string;
  label: string;
  description?: string;
  quantity: number;
  unite: string | null;
  price: number;
  tva: number;
  total?: number;
}

interface RawItem {
  id?: unknown;
  label?: unknown;
  description?: unknown;
  libelle?: unknown;
  quantity?: unknown;
  quantite?: unknown;
  unite?: unknown;
  unit?: unknown;
  price?: unknown;
  unitPrice?: unknown;
  prixHT?: unknown;
  tva?: unknown;
  tauxTVA?: unknown;
  total?: unknown;
}

function asString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Authoritative list of French VAT rates (2026):
 *   - 20   : taux normal (B2B, neuf, prestations standards)
 *   - 10   : rénovation logement >2 ans
 *   - 5.5  : amélioration énergétique
 *   - 2.1  : presse + médicaments remboursés (edge case, kept for completeness)
 *   - 0    : auto-entrepreneur franchise / TVA non applicable
 *
 * Snap any incoming rate to the nearest valid value. We had a 21% (Belgian)
 * surfacing on a freshly bulk-imported first line — most likely the LLM
 * mistyping or a stray edit through the per-line EditableField — so every
 * write boundary now runs values through this helper.
 */
export const FRENCH_VAT_RATES = [0, 2.1, 5.5, 10, 20] as const;

export function normalizeFrTva(value: unknown, fallback: number = 20): number {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  // Exact match (covers the happy path where the writer already passed a
  // canonical rate; avoids floating-point comparisons further down).
  for (const rate of FRENCH_VAT_RATES) {
    if (Math.abs(raw - rate) < 0.01) return rate;
  }
  // Off-spec: snap to the closest valid French rate. 21 → 20, 19.6 → 20,
  // 5.6 → 5.5. We cap at 20 below by construction (FRENCH_VAT_RATES max).
  // `best` is typed as plain number so the reassignment from a literal
  // FRENCH_VAT_RATES entry compiles under the `as const` array.
  let best: number = FRENCH_VAT_RATES[0];
  let bestDelta = Math.abs(raw - best);
  for (const rate of FRENCH_VAT_RATES) {
    const delta = Math.abs(raw - rate);
    if (delta < bestDelta) {
      best = rate;
      bestDelta = delta;
    }
  }
  return best;
}

function mintId(idx: number): string {
  return `l-${Date.now().toString(36)}-${idx}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Coerce any plausibly-shaped raw line into the canonical persisted shape.
 * Accepts legacy keys (description/unitPrice/total) and Émile API keys
 * (libelle/prixHT/tauxTVA) so the same writer code can be called from any
 * surface without forcing the caller to translate first.
 */
export function normalizeQuoteItem(
  raw: RawItem,
  idx: number,
  defaultTvaRaw: number = 20,
): QuoteItem {
  // The defaultTva parameter is the per-quote fallback — also snap it so a
  // caller passing 21 here doesn't poison every line that omitted its rate.
  const defaultTva = normalizeFrTva(defaultTvaRaw, 20);
  const label =
    asString(raw.label) ??
    asString(raw.libelle) ??
    asString(raw.description) ??
    "Prestation";

  const description = asString(raw.description);
  // Defense-in-depth: clamp away negative garbage before it reaches the JSONB
  // column. A devis line can't have a negative price or quantity. The Émile
  // tool and bulk-lines already reject these via zod; this guards the legacy
  // POST/PUT /api/quotes paths that only normalize (no per-line schema).
  const quantity = Math.max(0, asNumber(raw.quantity ?? raw.quantite, 1));
  const price = Math.max(0, asNumber(raw.price ?? raw.unitPrice ?? raw.prixHT, 0));
  // Snap to a valid French rate so a stray 21 / 19.6 / 5.6 from the LLM
  // or the per-line editor never lands in the JSONB column.
  const tva = normalizeFrTva(raw.tva ?? raw.tauxTVA, defaultTva);

  // unite/unit: prefer canonical key, fall back to legacy `unit`, null when
  // neither given (PDF renders "—" in that case).
  const uniteRaw = asString(raw.unite) ?? asString(raw.unit);
  const unite = uniteRaw ?? null;

  const id =
    asString(raw.id) ??
    mintId(idx);

  // total: trust caller's value if present, else compute. Stored for legacy
  // consumers that don't recompute; the canonical reader always recomputes.
  const totalRaw = Number(raw.total);
  const total = Number.isFinite(totalRaw) && totalRaw > 0
    ? +totalRaw.toFixed(2)
    : +(quantity * price).toFixed(2);

  return {
    id,
    label,
    ...(description && description !== label ? { description } : {}),
    quantity,
    unite,
    price,
    tva,
    total,
  };
}

export function normalizeQuoteItems(
  raw: unknown,
  defaultTva: number = 20,
): QuoteItem[] {
  if (!Array.isArray(raw)) return [];
  // normalizeQuoteItem snaps the default itself; passing the raw value
  // through is fine and keeps a single source of truth for the snapping.
  return (raw as RawItem[]).map((it, idx) =>
    normalizeQuoteItem(it, idx, defaultTva),
  );
}

/**
 * Multi-TVA aware totals. Mirrors the algorithm in `saveQuoteDraft` /
 * `bulk-lines` so a quote computed here matches the one stored at insert time.
 * The dominant rate is exposed as `taxRate` for the back-compat scalar column.
 */
export function computeQuoteTotals(items: QuoteItem[]): {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  taxBreakdown: Record<string, { base: number; tax: number; ttc: number }>;
  total: number;
} {
  const subtotal = +items
    .reduce((s, it) => s + it.price * it.quantity, 0)
    .toFixed(2);

  const breakdown: Record<string, { base: number; tax: number; ttc: number }> = {};
  for (const it of items) {
    const base = it.price * it.quantity;
    const key = String(it.tva);
    const bucket = breakdown[key] ?? { base: 0, tax: 0, ttc: 0 };
    bucket.base += base;
    bucket.tax += base * (it.tva / 100);
    breakdown[key] = bucket;
  }
  for (const k of Object.keys(breakdown)) {
    breakdown[k] = {
      base: +breakdown[k].base.toFixed(2),
      tax: +breakdown[k].tax.toFixed(2),
      ttc: +(breakdown[k].base + breakdown[k].tax).toFixed(2),
    };
  }
  const taxAmount = +Object.values(breakdown)
    .reduce((s, b) => s + b.tax, 0)
    .toFixed(2);
  const total = +(subtotal + taxAmount).toFixed(2);

  let taxRate = 20;
  let dominantBase = -1;
  for (const [rate, b] of Object.entries(breakdown)) {
    if (b.base > dominantBase) {
      dominantBase = b.base;
      taxRate = Number(rate);
    }
  }
  return { subtotal, taxRate, taxAmount, taxBreakdown: breakdown, total };
}
