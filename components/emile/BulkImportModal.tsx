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

export type BulkImportMode = "append" | "replace" | "new";

export interface BulkImportSuccess {
  quoteId: string;
  number: string;
  addedCount: number;
  totalLines: number;
  total: number;
  mode: BulkImportMode;
  /**
   * Full canonical items array after the bulk insert/merge. The modal forwards
   * it to the parent so the right-side preview can render the rows immediately,
   * without waiting for the LLM's next turn. Without this the panel showed
   * "0 lignes" right after a successful import, which lured users into
   * re-adding lines manually and corrupting the DB.
   */
  items: Array<{
    id: string;
    label: string;
    quantity: number;
    unite: string | null;
    price: number;
    tva: number;
  }>;
  /**
   * Client linked to the (created or updated) quote. The API hydrates this
   * from the conversation's related_client_id when the caller didn't pass an
   * explicit clientId, so mode="new" imports show the right name in the
   * right-panel preview without waiting for a reload.
   */
  client?: {
    id: string;
    name: string;
    first_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  rawText: string;
  quoteId?: string | null;
  conversationId?: string | null;
  clientId?: string | null;
  /**
   * How many lines are ALREADY on the active quote. When > 0, the modal
   * shows a 3-choice pre-step (append / replace / new) before the editor
   * so the user can't silently double-import. Parent owns the count (lives
   * in the right-panel state) so we don't pay a round-trip on open.
   */
  existingItemCount?: number;
  /** Active quote number, shown in the pre-step copy ("Devis QVI-… a 12 lignes"). */
  existingQuoteNumber?: string | null;
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

function stripLeadingNumber(s: string): string {
  // "1. Dépose baignoire" / "12) Pose carrelage" / "3 - Reprise plomberie"
  // → drop the bullet so the label cell carries the prestation only.
  return s.replace(/^\s*\d+\s*[.)\-–—:]\s*/, "");
}

function parseLine(line: string, defaultTva: number): DraftRow {
  const trimmed = line.trim();
  // 1. Pipe / tab / semicolon delimited "label | qty | unit? | price"
  const delim = /[|\t;]/.test(trimmed) ? /\s*[|\t;]\s*/ : null;
  if (delim) {
    const parts = trimmed.split(delim).filter(Boolean);
    if (parts.length >= 3) {
      const [labelRaw, qtyRaw, ...rest] = parts;
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
        label: stripLeadingNumber(labelRaw).trim(),
        quantity: qty != null ? String(qty) : "1",
        unite,
        price: price != null ? String(price) : "",
        tva: defaultTva,
      };
    }
  }

  // 2. "1. Désignation - 280€" or "Désignation : 280" or "Désignation 280€"
  //    Trailing number = price, leading "N." or "-" stripped.
  const stripped = stripLeadingNumber(trimmed);
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
  existingItemCount = 0,
  existingQuoteNumber,
  onImported,
}: BulkImportModalProps) {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // When the active quote already has lines, force the user to pick an
  // intent (append/replace/new) BEFORE the editor renders. Defaults to null
  // so the editor stays hidden behind the pre-step until a choice is made;
  // we collapse to "append" automatically when there's nothing to overwrite.
  const [mode, setMode] = useState<BulkImportMode | null>(null);
  // Tracking the rawText we last parsed prevents re-parsing on every render
  // and lets us reset cleanly if the user closes + opens with a different
  // paste (e.g. swapped tabs).
  const lastParsedRef = useRef<string | null>(null);

  const needsModeChoice = existingItemCount > 0;

  // Re-parse only when the modal (re)opens or the source paste changes.
  useEffect(() => {
    if (!open) return;
    if (lastParsedRef.current === rawText) return;
    lastParsedRef.current = rawText;
    setRows(parseBulk(rawText, 20));
    setConfirmClose(false);
    // Reset mode whenever the modal reopens with a new paste — the active
    // quote may have grown / shrunk since the previous import.
    setMode(needsModeChoice ? null : "append");
  }, [open, rawText, needsModeChoice]);

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
    if (!allValid || submitting || mode === null) return;
    setSubmitting(true);
    try {
      const payload = {
        ...(quoteId ? { quoteId } : {}),
        ...(conversationId ? { conversationId } : {}),
        ...(clientId ? { clientId } : {}),
        mode,
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
        quote: {
          id: string;
          number: string;
          total: number;
          client?: BulkImportSuccess["client"];
        };
        items: BulkImportSuccess["items"];
        addedCount: number;
        totalLines: number;
        mode: BulkImportMode;
      };
      const verb =
        json.mode === "replace"
          ? "remplacée"
          : json.mode === "new"
            ? "créée"
            : "ajoutée";
      const verbPlural =
        json.mode === "replace"
          ? "remplacées"
          : json.mode === "new"
            ? "créées"
            : "ajoutées";
      toastSuccess(
        `${json.addedCount} ligne${json.addedCount > 1 ? "s" : ""} ${json.addedCount > 1 ? verbPlural : verb}.`,
      );
      onImported({
        quoteId: json.quote.id,
        number: json.quote.number,
        addedCount: json.addedCount,
        totalLines: json.totalLines,
        total: json.quote.total,
        items: json.items ?? [],
        mode: json.mode ?? mode,
        client: json.quote.client ?? null,
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
              {mode === null && needsModeChoice
                ? "Que faire des lignes existantes ?"
                : "Import en masse"}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {mode === null && needsModeChoice
                ? `${existingItemCount} ligne${existingItemCount > 1 ? "s" : ""} déjà sur ${existingQuoteNumber ? `le devis ${existingQuoteNumber}` : "le devis en cours"}. Choisis comment intégrer les ${rows.length} nouvelle${rows.length > 1 ? "s" : ""}.`
                : `${rows.length} ligne${rows.length > 1 ? "s" : ""} détectée${rows.length > 1 ? "s" : ""}. Vérifie / édite avant d'importer.`}
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

        {mode === null && needsModeChoice ? (
          <ModeChoiceStep
            existingItemCount={existingItemCount}
            pendingCount={rows.length}
            onPick={(picked) => setMode(picked)}
            onCancel={attemptClose}
          />
        ) : (
        <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              Aucune ligne détectée. Ajoutes-en une manuellement.
            </p>
          ) : (
            <>
            {/* Mobile (<md): one card per row. Labels are full-width text
                and selectors get real touch-targets. The desktop table sits
                immediately below behind a `hidden md:table` so it never
                renders on small screens. */}
            <div className="md:hidden space-y-3">
              {rows.map((r, idx) => {
                const errs = errorsByRowId.get(r.id);
                const hasErr = !!errs;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-xl border bg-white p-3 shadow-sm",
                      hasErr
                        ? "border-red-200 bg-red-50/30"
                        : "border-[var(--border)]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Ligne {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        aria-label="Supprimer la ligne"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="mt-2 block text-[11px] font-semibold text-[var(--text-secondary)]">
                      Désignation *
                    </label>
                    <textarea
                      rows={2}
                      value={r.label}
                      onChange={(e) => update(r.id, { label: e.target.value })}
                      className={cn(
                        "mt-1 w-full resize-y rounded-lg border bg-white px-2.5 py-2 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
                        errs?.label
                          ? "border-red-300"
                          : "border-[var(--border)]",
                      )}
                    />
                    {errs?.label && (
                      <p className="mt-1 text-[11px] text-red-600">{errs.label}</p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                          Qté *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.quantity}
                          onChange={(e) =>
                            update(r.id, { quantity: e.target.value })
                          }
                          className={cn(
                            "mt-1 w-full rounded-lg border bg-white px-2.5 py-2 text-base text-right outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
                            errs?.quantity
                              ? "border-red-300"
                              : "border-[var(--border)]",
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                          Unité
                        </label>
                        <select
                          value={r.unite}
                          onChange={(e) =>
                            update(r.id, { unite: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                          {UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                          Prix HT *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={r.price}
                          onChange={(e) =>
                            update(r.id, { price: e.target.value })
                          }
                          className={cn(
                            "mt-1 w-full rounded-lg border bg-white px-2.5 py-2 text-base text-right outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
                            errs?.price
                              ? "border-red-300"
                              : "border-[var(--border)]",
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                          TVA
                        </label>
                        <select
                          value={r.tva}
                          onChange={(e) =>
                            update(r.id, { tva: Number(e.target.value) })
                          }
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-base outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                          {TVA_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[12px]">
                      <span className="text-[var(--text-muted)]">Total HT</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {EUR.format(rowTotalHT(r))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop (≥md): keep the dense table. */}
            <table className="hidden md:table w-full text-[13px]">
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
            </>
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
        )}

        {mode !== null && (
        // Sticky footer so the total + actions stay reachable on a 100-row
        // import without scrolling the modal back up. min-h-[44px] on the
        // buttons hits the Apple HIG touch-target guideline.
        <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col text-[13px] text-[var(--text-secondary)]">
            <span>
              Total HT :{" "}
              <span className="text-base font-bold text-[var(--text-primary)]">
                {EUR.format(subtotal)}
              </span>
            </span>
            {needsModeChoice && (
              <button
                type="button"
                onClick={() => setMode(null)}
                className="self-start text-[11px] text-[var(--text-muted)] underline-offset-2 transition-colors hover:text-[var(--primary)] hover:underline"
              >
                Changer le mode ({modeLabel(mode)})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={attemptClose}
              className="min-h-[44px] flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50 sm:flex-none"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allValid || submitting}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel(mode, rows.length)}
            </button>
          </div>
        </footer>
        )}
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

// ─── Mode choice step ──────────────────────────────────────────────────────
// Rendered BEFORE the line editor when the active quote already has items.
// Forces the user to pick an intent so we don't silently double-import.

function modeLabel(mode: BulkImportMode): string {
  switch (mode) {
    case "append":
      return "ajouter";
    case "replace":
      return "remplacer";
    case "new":
      return "nouveau devis";
  }
}

function submitLabel(mode: BulkImportMode, count: number): string {
  const plural = count > 1 ? "s" : "";
  switch (mode) {
    case "append":
      return `Ajouter ${count} ligne${plural}`;
    case "replace":
      return `Remplacer par ${count} ligne${plural}`;
    case "new":
      return `Créer un devis (${count} ligne${plural})`;
  }
}

interface ModeChoiceStepProps {
  existingItemCount: number;
  pendingCount: number;
  onPick: (mode: BulkImportMode) => void;
  onCancel: () => void;
}

function ModeChoiceStep({
  existingItemCount,
  pendingCount,
  onPick,
  onCancel,
}: ModeChoiceStepProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <ChoiceCard
          tone="default"
          title={`Ajouter aux ${existingItemCount} ligne${existingItemCount > 1 ? "s" : ""} existante${existingItemCount > 1 ? "s" : ""}`}
          description={`Le devis aura ${existingItemCount + pendingCount} ligne${existingItemCount + pendingCount > 1 ? "s" : ""} au total.`}
          onClick={() => onPick("append")}
        />
        <ChoiceCard
          tone="warn"
          title={`Remplacer tout (supprime les ${existingItemCount} ligne${existingItemCount > 1 ? "s" : ""})`}
          description={`Garde le numéro de devis, mais écrase les lignes actuelles. Seul un devis en brouillon peut être remplacé.`}
          onClick={() => onPick("replace")}
        />
        <ChoiceCard
          tone="default"
          title="Créer un nouveau devis"
          description={`Crée un brouillon séparé. L'ancien devis est conservé tel quel (et n'est plus lié à cette conversation).`}
          onClick={() => onPick("new")}
        />
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 self-center text-[12px] text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
        >
          Annuler l&apos;import
        </button>
      </div>
    </div>
  );
}

function ChoiceCard({
  tone,
  title,
  description,
  onClick,
}: {
  tone: "default" | "warn";
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30",
        tone === "warn"
          ? "border-amber-200 hover:border-amber-400"
          : "border-[var(--border)] hover:border-[var(--primary)]",
      )}
    >
      <p
        className={cn(
          "text-[14px] font-bold",
          tone === "warn" ? "text-amber-900" : "text-[var(--text-primary)]",
        )}
      >
        {title}
      </p>
      <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
        {description}
      </p>
    </button>
  );
}
