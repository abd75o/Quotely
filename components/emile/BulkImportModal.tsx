"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const UNITS: Array<{ value: string; label: string }> = [
  { value: "", label: "—" },
  { value: "u", label: "u" },
  { value: "h", label: "h" },
  { value: "j", label: "j" },
  { value: "m", label: "m" },
  { value: "m²", label: "m²" },
  { value: "m³", label: "m³" },
  { value: "ml", label: "ml" },
  { value: "kg", label: "kg" },
  { value: "l", label: "l" },
  { value: "forfait", label: "forfait" },
];

const TVA_OPTIONS = [
  { value: 0, label: "0 %" },
  { value: 5.5, label: "5,5 %" },
  { value: 10, label: "10 %" },
  { value: 20, label: "20 %" },
];

interface DraftRow {
  id: string;
  label: string;
  quantity: string;
  unite: string;
  price: string;
  tva: number;
}

export interface BulkImportSuccess {
  quoteId: string;
  number: string;
  addedCount: number;
  totalLines: number;
  total: number;
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  rawText: string;
  quoteId?: string | null;
  conversationId?: string | null;
  clientId?: string | null;
  onImported: (info: BulkImportSuccess) => void;
}

let rowSeq = 0;
function freshId(): string {
  rowSeq += 1;
  return `r-${Date.now().toString(36)}-${rowSeq}`;
}

// ─── Parsing heuristics ──────────────────────────────────────────────────────
//
// We try formats in decreasing order of structure. Anything we can't parse
// confidently lands in the `label` column with quantity/price blank, so the
// artisan only has to fill the missing cells instead of typing everything.

function normalisePrice(raw: string): string {
  // Strip currency / spaces, French decimal → JS decimal.
  return raw
    .replace(/€|EUR| |\s+/gi, "")
    .replace(/,(\d{1,2})$/, ".$1");
}

function parseNumber(raw: string): number | null {
  const cleaned = normalisePrice(raw);
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseLine(line: string, defaultTva: number): DraftRow {
  const trimmed = line.trim();
  // 1. Pipe / tab / semicolon delimited "label | qty | unit? | price"
  const delim = /[|\t;]/.test(trimmed) ? /\s*[|\t;]\s*/ : null;
  if (delim) {
    const parts = trimmed.split(delim).filter(Boolean);
    if (parts.length >= 3) {
      const [label, qtyRaw, ...rest] = parts;
      let unite = "";
      let priceRaw = rest[rest.length - 1] ?? "";
      // If a unit cell sits between qty and price.
      if (rest.length >= 2) {
        const candidateUnit = rest[0].trim();
        if (UNITS.some((u) => u.value === candidateUnit)) {
          unite = candidateUnit;
          priceRaw = rest[rest.length - 1];
        }
      }
      const qty = parseNumber(qtyRaw);
      const price = parseNumber(priceRaw);
      return {
        id: freshId(),
        label: label.trim(),
        quantity: qty != null ? String(qty) : "1",
        unite,
        price: price != null ? String(price) : "",
        tva: defaultTva,
      };
    }
  }

  // 2. "1. Désignation - 280€" or "Désignation : 280" or "Désignation 280€"
  //    Trailing number = price, leading "N." or "-" stripped.
  const stripped = trimmed.replace(/^\s*\d+\s*[.\)]\s*/, "");
  const priceMatch = /([\d ., ]+)\s*(?:€|EUR|HT)?\s*$/i.exec(stripped);
  if (priceMatch && /\d/.test(priceMatch[1])) {
    const labelPart = stripped.slice(0, priceMatch.index).replace(/[-:–—]\s*$/, "").trim();
    const price = parseNumber(priceMatch[1]);
    if (labelPart && price != null) {
      return {
        id: freshId(),
        label: labelPart,
        quantity: "1",
        unite: "",
        price: String(price),
        tva: defaultTva,
      };
    }
  }

  // 3. Fallback: whole line into label, artisan completes the rest.
  return {
    id: freshId(),
    label: stripped || trimmed,
    quantity: "1",
    unite: "",
    price: "",
    tva: defaultTva,
  };
}

function parseBulk(raw: string, defaultTva: number): DraftRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.map((l) => parseLine(l, defaultTva));
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface RowErrors {
  label?: string;
  quantity?: string;
  price?: string;
  tva?: string;
}

function validateRow(r: DraftRow): RowErrors {
  const errs: RowErrors = {};
  if (!r.label.trim()) errs.label = "Désignation requise";
  const q = Number(r.quantity);
  if (!Number.isFinite(q) || q <= 0) errs.quantity = "Qté > 0";
  const p = Number(r.price);
  if (!Number.isFinite(p) || p < 0) errs.price = "Prix invalide";
  if (!Number.isFinite(r.tva)) errs.tva = "TVA invalide";
  return errs;
}

function rowTotalHT(r: DraftRow): number {
  const q = Number(r.quantity);
  const p = Number(r.price);
  if (!Number.isFinite(q) || !Number.isFinite(p)) return 0;
  return q * p;
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

// ─── Component ───────────────────────────────────────────────────────────────

export function BulkImportModal({
  open,
  onClose,
  rawText,
  quoteId,
  conversationId,
  clientId,
  onImported,
}: BulkImportModalProps) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // Tracking the rawText we last parsed prevents re-parsing on every render
  // and lets us reset cleanly if the user closes + opens with a different
  // paste (e.g. swapped tabs).
  const lastParsedRef = useRef<string | null>(null);

  // Re-parse only when the modal (re)opens or the source paste changes.
  useEffect(() => {
    if (!open) return;
    if (lastParsedRef.current === rawText) return;
    lastParsedRef.current = rawText;
    setRows(parseBulk(rawText, 20));
    setConfirmClose(false);
  }, [open, rawText]);

  // Body scroll lock + ESC.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") attemptClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const errorsByRowId = useMemo(() => {
    const map = new Map<string, RowErrors>();
    for (const r of rows) {
      const e = validateRow(r);
      if (Object.keys(e).length > 0) map.set(r.id, e);
    }
    return map;
  }, [rows]);

  const allValid = errorsByRowId.size === 0 && rows.length > 0;
  const subtotal = useMemo(
    () => rows.reduce((s, r) => s + rowTotalHT(r), 0),
    [rows],
  );

  const update = useCallback(
    (id: string, patch: Partial<DraftRow>) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [],
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: freshId(),
        label: "",
        quantity: "1",
        unite: "",
        price: "",
        tva: 20,
      },
    ]);
  }, []);

  function attemptClose() {
    // No confirmation if the user hasn't touched anything yet (defensive: if
    // they pasted by accident and want to back out cleanly, don't badger).
    if (rows.length === 0) {
      onClose();
      return;
    }
    setConfirmClose(true);
  }

  async function handleSubmit() {
    if (!allValid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        ...(quoteId ? { quoteId } : {}),
        ...(conversationId ? { conversationId } : {}),
        ...(clientId ? { clientId } : {}),
        lines: rows.map((r) => ({
          label: r.label.trim(),
          quantity: Number(r.quantity),
          unite: r.unite || null,
          price: Number(r.price),
          tva: r.tva,
        })),
      };
      const res = await fetch("/api/quotes/bulk-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body;
      }
      const json = (await res.json()) as {
        quote: { id: string; number: string; total: number };
        addedCount: number;
        totalLines: number;
      };
      toastSuccess(
        `${json.addedCount} ligne${json.addedCount > 1 ? "s" : ""} ajoutée${json.addedCount > 1 ? "s" : ""} au devis.`,
      );
      onImported({
        quoteId: json.quote.id,
        number: json.quote.number,
        addedCount: json.addedCount,
        totalLines: json.totalLines,
        total: json.quote.total,
      });
      onClose();
    } catch (err) {
      console.error("[BulkImportModal] submit failed:", err);
      toastError(humanizeError(err, "Impossible d'importer les lignes."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import en masse"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) attemptClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
          <div>
            <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">
              Import en masse
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {rows.length} ligne{rows.length > 1 ? "s" : ""} détectée
              {rows.length > 1 ? "s" : ""}. Vérifie / édite avant
              d&apos;importer.
            </p>
          </div>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              Aucune ligne détectée. Ajoutes-en une manuellement.
            </p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-2 pr-2 text-left">Désignation *</th>
                  <th className="w-20 py-2 px-2 text-right">Qté *</th>
                  <th className="w-24 py-2 px-2 text-left">Unité</th>
                  <th className="w-28 py-2 px-2 text-right">Prix HT *</th>
                  <th className="w-24 py-2 px-2 text-left">TVA</th>
                  <th className="w-28 py-2 px-2 text-right">Total HT</th>
                  <th className="w-10 py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const errs = errorsByRowId.get(r.id);
                  const hasErr = !!errs;
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-[var(--border)] align-top",
                        hasErr && "bg-red-50/40",
                      )}
                    >
                      <td className="py-1.5 pr-2">
                        <textarea
                          rows={1}
                          value={r.label}
                          onChange={(e) =>
                            update(r.id, { label: e.target.value })
                          }
                          title={errs?.label}
                          className={cn(
                            "w-full resize-y rounded-lg border bg-white px-2 py-1.5 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
                            errs?.label
                              ? "border-red-300"
                              : "border-[var(--border)]",
                          )}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.quantity}
                          onChange={(e) =>
                            update(r.id, { quantity: e.target.value })
                          }
                          title={errs?.quantity}
                          className={cn(
                            "w-full rounded-lg border bg-white px-2 py-1.5 text-right outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
                            errs?.quantity
                              ? "border-red-300"
                              : "border-[var(--border)]",
                          )}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={r.unite}
                          onChange={(e) =>
                            update(r.id, { unite: e.target.value })
                          }
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                          {UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.price}
                          onChange={(e) =>
                            update(r.id, { price: e.target.value })
                          }
                          title={errs?.price}
                          className={cn(
                            "w-full rounded-lg border bg-white px-2 py-1.5 text-right outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
                            errs?.price
                              ? "border-red-300"
                              : "border-[var(--border)]",
                          )}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={r.tva}
                          onChange={(e) =>
                            update(r.id, { tva: Number(e.target.value) })
                          }
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                          {TVA_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-right font-semibold text-[var(--text-primary)]">
                        {EUR.format(rowTotalHT(r))}
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          aria-label="Supprimer la ligne"
                          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <button
            type="button"
            onClick={addRow}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une ligne
          </button>

          {errorsByRowId.size > 0 && (
            <p className="mt-3 text-[12px] text-red-600">
              {errorsByRowId.size} ligne{errorsByRowId.size > 1 ? "s" : ""}{" "}
              à corriger avant import.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-white px-6 py-3">
          <div className="text-[13px] text-[var(--text-secondary)]">
            Total HT :{" "}
            <span className="text-base font-bold text-[var(--text-primary)]">
              {EUR.format(subtotal)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={attemptClose}
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allValid || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Importer {rows.length} ligne{rows.length > 1 ? "s" : ""}
            </button>
          </div>
        </footer>
      </div>

      {confirmClose && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmClose(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Quitter sans importer ?
            </h3>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Les lignes saisies seront perdues. Tu pourras toujours coller à
              nouveau le texte.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-gray-50"
              >
                Continuer
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClose(false);
                  onClose();
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-red-700"
              >
                Quitter quand même
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
