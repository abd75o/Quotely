"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { TextField, SelectField } from "@/components/ui/Field";
import { toastError, toastSuccess } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";
import { QUOTE_UNITS } from "@/lib/quotes/units";
import type { EmileQuoteLine } from "./types";

const TVA_OPTIONS = [
  { value: "20", label: "20% (standard)" },
  { value: "10", label: "10% (rénovation +2 ans)" },
  { value: "5.5", label: "5,5% (éco)" },
  { value: "0", label: "0% (franchise AE)" },
];

interface NewQuoteLineModalProps {
  open: boolean;
  onClose: () => void;
  defaultTva?: number;
  /**
   * Called with the new line. The parent is responsible for adding it
   * to the current quote and persisting (PUT /api/quotes/[id]).
   */
  onAdd: (line: EmileQuoteLine) => void | Promise<void>;
}

interface FormState {
  label: string;
  quantity: string;
  unit: string;
  price: string;
  tva: string;
}

export function NewQuoteLineModal({
  open,
  onClose,
  defaultTva = 20,
  onAdd,
}: NewQuoteLineModalProps) {
  const [form, setForm] = useState<FormState>({
    label: "",
    quantity: "1",
    unit: "",
    price: "",
    tva: String(defaultTva),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        label: "",
        quantity: "1",
        unit: "",
        price: "",
        tva: String(defaultTva),
      });
    }
  }, [open, defaultTva]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const qtyNum = Number(form.quantity);
  const priceNum = Number(form.price);
  const tvaNum = Number(form.tva);
  const totalHT = Number.isFinite(qtyNum * priceNum) ? qtyNum * priceNum : 0;

  const valid =
    form.label.trim().length > 0 &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0 &&
    Number.isFinite(priceNum) &&
    priceNum >= 0 &&
    Number.isFinite(tvaNum);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onAdd({
        id: `line-${Date.now()}`,
        label: form.label.trim(),
        quantity: qtyNum,
        unit: form.unit || null,
        price: priceNum,
        tva: tvaNum,
      });
      toastSuccess("Ligne ajoutée au devis.");
      onClose();
    } catch (err) {
      console.error("[NewQuoteLineModal] add failed:", err);
      toastError(humanizeError(err, "Impossible d'ajouter la ligne."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nouvelle ligne de devis"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-3.5">
          <h2 className="font-fraunces text-base font-bold text-[var(--text-primary)]">
            Nouvelle ligne
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="line-label"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Libellé *
            </label>
            <textarea
              id="line-label"
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              placeholder="Ex : Pose carrelage cuisine 12 m²"
              rows={2}
              autoFocus
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="line-qty"
              label="Quantité *"
              type="number"
              step="0.01"
              min="0"
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              required
            />
            <SelectField
              id="line-unit"
              label="Unité"
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
              options={[...QUOTE_UNITS]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="line-price"
              label="Prix unitaire HT *"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="0.00"
              required
            />
            <SelectField
              id="line-tva"
              label="TVA *"
              value={form.tva}
              onChange={(e) => update("tva", e.target.value)}
              options={TVA_OPTIONS}
              required
            />
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--text-muted)]">Total HT</span>
              <span className="text-base font-bold text-[var(--text-primary)]">
                {totalHT.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!valid || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Ajouter au devis
          </button>
        </footer>
      </form>
    </div>
  );
}
