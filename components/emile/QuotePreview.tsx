"use client";

import {
  CheckCircle2,
  Eye,
  Maximize2,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { EditableField } from "./EditableField";
import { LockedField } from "./LockedField";
import type {
  EmileQuoteDraft,
  EmileQuoteLine,
  EmileQuoteStatus,
} from "./types";

interface QuotePreviewProps {
  quote: EmileQuoteDraft;
  onUpdate: (next: EmileQuoteDraft) => void;
  onClose?: () => void;
  onLockedFieldClick?: (reason: string) => void;
  onSendBackToEmile?: () => void;
  onPreviewPdf?: () => void;
  onSend?: () => void;
  onResend?: () => void;
  onOpenFullscreen?: () => void;
  /**
   * When provided, the "+ Ajouter une ligne" button calls this callback
   * instead of inserting a default placeholder line. Lets the parent
   * open a proper modal with TVA / unit / price fields.
   */
  onOpenAddLine?: () => void;
  /**
   * When provided AND the quote has no client yet, the "Aucun client" field
   * turns into a "Sélectionner un client" button that delegates to the
   * parent (which owns the selector modal + the PATCH to /api/quotes/:id).
   * Omit to keep the locked-field behaviour (e.g. once a client is set).
   */
  onPickClient?: () => void;
}

const LOCK_REASONS: Record<string, string> = {
  number: "Demande à Émile pour modifier le numéro de devis.",
  client: "Demande à Émile pour changer le client.",
};

export function QuotePreview({
  quote,
  onUpdate,
  onClose,
  onLockedFieldClick,
  onSendBackToEmile,
  onPreviewPdf,
  onSend,
  onResend,
  onOpenFullscreen,
  onOpenAddLine,
  onPickClient,
}: QuotePreviewProps) {
  const isSigned = quote.status === "signed";
  const isSentOrLater =
    quote.status === "sent" ||
    quote.status === "viewed" ||
    quote.status === "signed";
  const validated = isSentOrLater || isSigned;

  const totals = computeTotals(quote);

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
    onUpdate({
      ...quote,
      lines: quote.lines.filter((l) => l.id !== lineId),
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
          quantity: 1,
          unit: null,
          tva: quote.tva,
        },
      ],
    });
  }

  function handleLockedClick(reason: string) {
    onLockedFieldClick?.(reason);
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-[var(--surface)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Pencil className="h-4 w-4 flex-shrink-0 text-[var(--primary)]" />
          <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">
            Devis {quote.number}
          </h2>
          <StatusBadge status={quote.status} />
        </div>
        <div className="flex items-center gap-1">
          {onOpenFullscreen && (
            <button
              type="button"
              onClick={onOpenFullscreen}
              aria-label="Voir en plein écran"
              title="Voir en plein écran"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la preview"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-5 p-4 lg:p-6">
          <section className="rounded-xl border border-[var(--border)] bg-white p-4">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <Field label="Numéro">
                <LockedField
                  value={quote.number}
                  lockReason={LOCK_REASONS.number}
                  onClick={handleLockedClick}
                />
              </Field>
              <Field label="Client">
                {quote.client?.name ? (
                  <LockedField
                    value={quote.client.name}
                    lockReason={LOCK_REASONS.client}
                    onClick={handleLockedClick}
                  />
                ) : onPickClient && !validated ? (
                  <button
                    type="button"
                    onClick={onPickClient}
                    className="inline-flex items-center gap-1.5 self-start rounded-lg border border-dashed border-[var(--primary)]/40 bg-[var(--primary-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-bg)]/70"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Sélectionner un client
                  </button>
                ) : (
                  <LockedField
                    value="—"
                    lockReason={LOCK_REASONS.client}
                    onClick={handleLockedClick}
                  />
                )}
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
              <Field label="TVA défaut">
                <EditableField
                  value={`${quote.tva}`}
                  onSave={(v) => {
                    const n = Number(v);
                    if (!Number.isNaN(n) && n >= 0) {
                      onUpdate({ ...quote, tva: n });
                    }
                  }}
                  type="number"
                  label="Taux de TVA par défaut"
                  width="3.5rem"
                  disabled={validated}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-white">
            <div className="border-b border-[var(--border)] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Prestations
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {quote.lines.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  defaultTva={quote.tva}
                  validated={validated}
                  onChange={(patch) => updateLine(line.id, patch)}
                  onDelete={() => deleteLine(line.id)}
                />
              ))}
              {quote.lines.length === 0 && (
                <li className="px-4 py-6 text-center text-[12px] text-[var(--text-muted)]">
                  Aucune ligne pour le moment.
                </li>
              )}
            </ul>
            <div className="border-t border-[var(--border)] px-4 py-3 text-[13px]">
              <Totals totals={totals} />
            </div>
          </section>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-white px-4 py-3">
        {!validated && (
          <button
            type="button"
            onClick={onOpenAddLine ?? addLine}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une ligne
          </button>
        )}
        {onPreviewPdf && (
          <button
            type="button"
            onClick={onPreviewPdf}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Aperçu PDF
          </button>
        )}
        {!isSentOrLater && onSendBackToEmile && (
          <button
            type="button"
            onClick={onSendBackToEmile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary-bg)]"
          >
            <Send className="h-3.5 w-3.5" />
            Mettre à jour Émile
          </button>
        )}
        {isSigned && quote.signature ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCFCE7] px-3 py-1.5 text-[12px] font-semibold text-[#166534]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Signé
            {quote.signature.fullName ? ` par ${quote.signature.fullName}` : ""}
          </span>
        ) : isSentOrLater && onResend ? (
          <button
            type="button"
            onClick={onResend}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Eye className="h-3.5 w-3.5" />
            Renvoyer
          </button>
        ) : (
          onSend && (
            <button
              type="button"
              onClick={onSend}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />
              Envoyer
            </button>
          )
        )}
      </footer>
    </div>
  );
}

interface LineRowProps {
  line: EmileQuoteLine;
  defaultTva: number;
  validated: boolean;
  onChange: (patch: Partial<EmileQuoteLine>) => void;
  onDelete: () => void;
}

function LineRow({
  line,
  defaultTva,
  validated,
  onChange,
  onDelete,
}: LineRowProps) {
  const tva = line.tva ?? defaultTva;
  const totalHT = line.price * (line.quantity || 1);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <EditableField
            value={line.label}
            onSave={(v) => onChange({ label: v })}
            label="Description de la prestation"
            disabled={validated}
          />
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Total HT : <strong>{formatEuros(totalHT)}</strong>
          </div>
        </div>
        {!validated && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Supprimer la ligne"
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-secondary)]">
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Qté
        </span>
        <EditableField
          value={line.quantity}
          onSave={(v) => {
            const n = Number(v);
            if (!Number.isNaN(n) && n > 0) onChange({ quantity: n });
          }}
          type="number"
          label="Quantité"
          width="3.5rem"
          disabled={validated}
        />
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Unité
        </span>
        <EditableField
          value={line.unit ?? "—"}
          onSave={(v) => onChange({ unit: v })}
          label="Unité"
          width="3.5rem"
          disabled={validated}
        />
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          PU HT
        </span>
        <EditableField
          value={line.price}
          onSave={(v) => {
            const n = Number(v);
            if (!Number.isNaN(n)) onChange({ price: n });
          }}
          type="number"
          label="Prix unitaire HT"
          width="5rem"
          disabled={validated}
        />
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          TVA
        </span>
        <EditableField
          value={`${tva}`}
          onSave={(v) => {
            const n = Number(v);
            if (!Number.isNaN(n) && n >= 0) onChange({ tva: n });
          }}
          type="number"
          label="Taux TVA"
          width="3rem"
          disabled={validated}
        />
        <span className="text-[10px]">%</span>
      </div>
    </li>
  );
}

interface TotalsBreakdown {
  subtotal: number;
  byRate: Array<{ rate: number; base: number; amount: number }>;
  taxAmount: number;
  total: number;
}

function computeTotals(quote: EmileQuoteDraft): TotalsBreakdown {
  let subtotal = 0;
  const groups: Record<string, { rate: number; base: number; amount: number }> =
    {};
  for (const line of quote.lines) {
    const base = line.price * (line.quantity || 1);
    const rate = line.tva ?? quote.tva ?? 20;
    subtotal += base;
    const key = String(rate);
    if (!groups[key]) groups[key] = { rate, base: 0, amount: 0 };
    groups[key].base += base;
    groups[key].amount += base * (rate / 100);
  }
  const byRate = Object.values(groups).sort((a, b) => a.rate - b.rate);
  const taxAmount = byRate.reduce((s, g) => s + g.amount, 0);
  return {
    subtotal: round2(subtotal),
    byRate: byRate.map((g) => ({
      rate: g.rate,
      base: round2(g.base),
      amount: round2(g.amount),
    })),
    taxAmount: round2(taxAmount),
    total: round2(subtotal + taxAmount),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

function StatusBadge({ status }: { status: EmileQuoteStatus }) {
  const config: Record<
    EmileQuoteStatus,
    { label: string; bg: string; fg: string }
  > = {
    draft: { label: "🟡 Brouillon", bg: "#FAEEDA", fg: "#854F0B" },
    ready: { label: "🟢 Prêt à envoyer", bg: "#EAF3DE", fg: "#3B6D11" },
    sent: { label: "📤 Envoyé", bg: "#E0E7FF", fg: "#3730A3" },
    viewed: { label: "👀 Ouvert", bg: "#FEF3C7", fg: "#92400E" },
    signed: { label: "✅ Signé", bg: "#DCFCE7", fg: "#166534" },
    refused: { label: "❌ Refusé", bg: "#FEE2E2", fg: "#991B1B" },
    expired: { label: "⏰ Expiré", bg: "#F3F4F6", fg: "#6B7280" },
  };
  const c = config[status] ?? config.draft;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {c.label}
    </span>
  );
}

export function Totals({ totals }: { totals: TotalsBreakdown }) {
  return (
    <div className="space-y-1">
      <Row label="Sous-total HT" value={totals.subtotal} />
      {totals.byRate.map((g) => (
        <Row
          key={g.rate}
          label={`TVA ${g.rate}% (sur ${formatEuros(g.base)})`}
          value={g.amount}
        />
      ))}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5 text-[var(--text-primary)]">
        <span className="text-[13px] font-semibold">Total TTC</span>
        <span className="text-[14px] font-bold">
          {formatEuros(totals.total)}
        </span>
      </div>
    </div>
  );
}

export function computeQuoteTotals(quote: EmileQuoteDraft): TotalsBreakdown {
  return computeTotals(quote);
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[var(--text-secondary)]">
      <span>{label}</span>
      <span>{formatEuros(value)}</span>
    </div>
  );
}

export function formatEuros(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
