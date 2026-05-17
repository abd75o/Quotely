"use client";

import { useEffect } from "react";
import { FileText, Plus, Trash2, X } from "lucide-react";
import { EditableField } from "./EditableField";
import {
  Totals,
  computeQuoteTotals,
  formatEuros,
} from "./QuotePreview";
import type { EmileQuoteDraft, EmileQuoteLine } from "./types";

interface QuoteFullscreenProps {
  quote: EmileQuoteDraft;
  onUpdate: (next: EmileQuoteDraft) => void;
  onClose: () => void;
  onOpenAddLine?: () => void;
}

export function QuoteFullscreen({
  quote,
  onUpdate,
  onClose,
  onOpenAddLine,
}: QuoteFullscreenProps) {
  const validated =
    quote.status === "sent" ||
    quote.status === "viewed" ||
    quote.status === "signed";
  const totals = computeQuoteTotals(quote);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function updateLine(lineId: string, patch: Partial<EmileQuoteLine>) {
    onUpdate({
      ...quote,
      lines: quote.lines.map((l) =>
        l.id === lineId ? { ...l, ...patch } : l,
      ),
    });
  }

  function deleteLine(lineId: string) {
    if (!confirm("Supprimer cette ligne ?")) return;
    onUpdate({ ...quote, lines: quote.lines.filter((l) => l.id !== lineId) });
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
          quantity: 1,
          unit: null,
          tva: quote.tva,
        },
      ],
    });
  }

  function openPdf() {
    if (!quote.id) return;
    window.open(`/api/quotes/${quote.id}/pdf`, "_blank");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Devis en plein écran"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[90vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
          <div className="min-w-0">
            <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">
              Devis {quote.number}
            </h1>
            <p className="text-[12px] text-[var(--text-muted)]">
              {quote.client?.name
                ? `Pour ${quote.client.name}`
                : "Client non défini"}{" "}
              · Date {quote.date} · Validité {quote.validity} jours
            </p>
          </div>
          <div className="flex items-center gap-2">
            {quote.id && (
              <button
                type="button"
                onClick={openPdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <FileText className="h-3.5 w-3.5" />
                Aperçu PDF
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
              Fermer
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)] px-6 py-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Company / client cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Émetteur
                </p>
                <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
                  Votre entreprise
                </p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Vérifie tes infos dans /dashboard/parametres.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Client
                </p>
                <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
                  {quote.client?.name ?? "Aucun client sélectionné"}
                </p>
                {quote.client?.email && (
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    {quote.client.email}
                  </p>
                )}
                {quote.client?.address && (
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    {quote.client.address}
                    {quote.client.postal_code
                      ? `, ${quote.client.postal_code}`
                      : ""}{" "}
                    {quote.client.city ?? ""}
                  </p>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              <div className="grid grid-cols-[1fr_70px_70px_90px_70px_90px_30px] gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                <span>Description</span>
                <span className="text-right">Qté</span>
                <span className="text-center">Unité</span>
                <span className="text-right">PU HT</span>
                <span className="text-right">TVA</span>
                <span className="text-right">Total HT</span>
                <span />
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {quote.lines.map((line) => {
                  const tva = line.tva ?? quote.tva;
                  const totalHT = line.price * (line.quantity || 1);
                  return (
                    <li
                      key={line.id}
                      className="grid grid-cols-[1fr_70px_70px_90px_70px_90px_30px] items-center gap-2 px-4 py-2.5"
                    >
                      <EditableField
                        value={line.label}
                        onSave={(v) => updateLine(line.id, { label: v })}
                        label="Description"
                        disabled={validated}
                      />
                      <div className="flex justify-end">
                        <EditableField
                          value={line.quantity}
                          onSave={(v) => {
                            const n = Number(v);
                            if (!Number.isNaN(n) && n > 0)
                              updateLine(line.id, { quantity: n });
                          }}
                          type="number"
                          label="Quantité"
                          width="3.5rem"
                          disabled={validated}
                        />
                      </div>
                      <div className="flex justify-center">
                        <EditableField
                          value={line.unit ?? "—"}
                          onSave={(v) => updateLine(line.id, { unit: v })}
                          label="Unité"
                          width="3rem"
                          disabled={validated}
                        />
                      </div>
                      <div className="flex justify-end">
                        <EditableField
                          value={line.price}
                          onSave={(v) => {
                            const n = Number(v);
                            if (!Number.isNaN(n))
                              updateLine(line.id, { price: n });
                          }}
                          type="number"
                          label="Prix unitaire HT"
                          width="5rem"
                          disabled={validated}
                        />
                      </div>
                      <div className="flex justify-end">
                        <EditableField
                          value={`${tva}`}
                          onSave={(v) => {
                            const n = Number(v);
                            if (!Number.isNaN(n) && n >= 0)
                              updateLine(line.id, { tva: n });
                          }}
                          type="number"
                          label="Taux TVA"
                          width="3rem"
                          disabled={validated}
                        />
                      </div>
                      <span className="text-right text-[13px] font-semibold text-[var(--text-primary)]">
                        {formatEuros(totalHT)}
                      </span>
                      <div className="flex justify-end">
                        {!validated && (
                          <button
                            type="button"
                            onClick={() => deleteLine(line.id)}
                            aria-label="Supprimer la ligne"
                            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
                {quote.lines.length === 0 && (
                  <li className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
                    Aucune ligne. Ajoute-en une ci-dessous.
                  </li>
                )}
              </ul>
              {!validated && (
                <div className="border-t border-[var(--border)] px-4 py-2">
                  <button
                    type="button"
                    onClick={onOpenAddLine ?? addLine}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une ligne
                  </button>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="ml-auto w-full max-w-sm rounded-xl border border-[var(--border)] bg-white p-4 text-[13px]">
              <Totals totals={totals} />
            </div>

            <p className="text-[11px] italic text-[var(--text-muted)]">
              Les mentions légales seront générées automatiquement à l&apos;envoi
              selon ton métier et le type de client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
