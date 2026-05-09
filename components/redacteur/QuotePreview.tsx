"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { EditableField } from "./EditableField";
import { LockedField } from "./LockedField";
import type { QuoteDraft, QuoteLine } from "./types";

interface QuotePreviewProps {
  quote: QuoteDraft;
  onUpdate: (next: QuoteDraft) => void;
  onClose: () => void;
  onLockedFieldClick: (reason: string) => void;
  onValidate: () => void;
  onDeleteLine: (lineId: string) => void;
}

const LOCK_REASONS: Record<string, string> = {
  number: "Demande-moi pour modifier le numéro de devis.",
  client: "Demande-moi pour changer le client.",
  tva: "Demande-moi pour modifier la TVA.",
};

export function QuotePreview({
  quote,
  onUpdate,
  onClose,
  onLockedFieldClick,
  onValidate,
  onDeleteLine,
}: QuotePreviewProps) {
  const validated = quote.status !== "draft";
  const subtotal = quote.lines.reduce((s, l) => s + l.price, 0);
  const taxAmount = subtotal * (quote.tva / 100);
  const total = subtotal + taxAmount;

  function updateLine(lineId: string, patch: Partial<QuoteLine>) {
    onUpdate({
      ...quote,
      lines: quote.lines.map((l) =>
        l.id === lineId ? { ...l, ...patch } : l,
      ),
    });
  }

  function addLine() {
    onUpdate({
      ...quote,
      lines: [
        ...quote.lines,
        {
          id: `line-${Date.now()}`,
          label: "Nouvelle prestation",
          price: 100,
        },
      ],
    });
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#FAFAFB]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-[#534AB7]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Devis
          </h2>
          <StatusBadge status={quote.status} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la preview"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-5 p-4 lg:p-6">
          <section className="rounded-xl border border-[var(--border)] bg-white p-4">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <Field label="Numéro">
                <LockedField
                  value={quote.number}
                  lockReason={LOCK_REASONS.number}
                  onClick={onLockedFieldClick}
                />
              </Field>
              <Field label="Client">
                <LockedField
                  value={quote.client.name}
                  lockReason={LOCK_REASONS.client}
                  onClick={onLockedFieldClick}
                />
              </Field>
              <Field label="Date">
                <EditableField
                  value={quote.date}
                  onSave={(v) => onUpdate({ ...quote, date: v })}
                  type="text"
                  label="Date du devis"
                  disabled={validated}
                />
              </Field>
              <Field label="Validité (jours)">
                <EditableField
                  value={quote.validity}
                  onSave={(v) => {
                    const n = Number(v);
                    if (!Number.isNaN(n) && n > 0) {
                      onUpdate({ ...quote, validity: n });
                    }
                  }}
                  type="number"
                  label="Validité en jours"
                  disabled={validated}
                />
              </Field>
              <Field label="TVA">
                <LockedField
                  value={`${quote.tva}%`}
                  lockReason={LOCK_REASONS.tva}
                  onClick={onLockedFieldClick}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-white">
            <div className="border-b border-[var(--border)] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Prestations
            </div>
            <ul className="divide-y divide-[var(--border-light)]">
              {quote.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <EditableField
                      value={line.label}
                      onSave={(v) => updateLine(line.id, { label: v })}
                      label="Description de la prestation"
                      disabled={validated}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <EditableField
                      value={line.price}
                      onSave={(v) => {
                        const n = Number(v);
                        if (!Number.isNaN(n)) {
                          updateLine(line.id, { price: n });
                        }
                      }}
                      type="number"
                      label="Prix HT"
                      width="6rem"
                      disabled={validated}
                    />
                    <span className="text-[12px] text-[var(--text-muted)]">€</span>
                    {!validated && (
                      <button
                        type="button"
                        onClick={() => onDeleteLine(line.id)}
                        aria-label="Supprimer la ligne"
                        className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-[var(--border)] px-4 py-3 text-[13px]">
              <Totals
                subtotal={subtotal}
                taxAmount={taxAmount}
                taxRate={quote.tva}
                total={total}
              />
            </div>
          </section>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-white px-4 py-3">
        {!validated && (
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une ligne
          </button>
        )}
        <button
          type="button"
          onClick={onValidate}
          disabled={validated}
          className="rounded-lg bg-[#534AB7] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#3C3489] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {validated ? "Validé" : "Valider le devis"}
        </button>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: QuoteDraft["status"] }) {
  if (status === "validated" || status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[10px] font-semibold text-[#3B6D11]">
        Validé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-semibold text-[#854F0B]">
      Brouillon
    </span>
  );
}

function Totals({
  subtotal,
  taxAmount,
  taxRate,
  total,
}: {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  total: number;
}) {
  return (
    <div className="space-y-1">
      <Row label="Sous-total HT" value={subtotal} />
      <Row label={`TVA (${taxRate}%)`} value={taxAmount} />
      <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-1.5 text-[var(--text-primary)]">
        <span className="text-[13px] font-semibold">Total TTC</span>
        <span className="text-[14px] font-bold">{formatEuros(total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[var(--text-secondary)]">
      <span>{label}</span>
      <span>{formatEuros(value)}</span>
    </div>
  );
}

function formatEuros(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
