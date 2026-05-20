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
  defaultTva: number = 20,
): QuoteItem {
  const label =
    asString(raw.label) ??
    asString(raw.libelle) ??
    asString(raw.description) ??
    "Prestation";

  const description = asString(raw.description);
  const quantity = asNumber(raw.quantity ?? raw.quantite, 1);
  const price = asNumber(raw.price ?? raw.unitPrice ?? raw.prixHT, 0);
  const tva = asNumber(raw.tva ?? raw.tauxTVA, defaultTva);

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
  return (raw as RawItem[]).map((it, idx) => normalizeQuoteItem(it, idx, defaultTva));
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
