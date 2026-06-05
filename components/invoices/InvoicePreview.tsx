"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Edit3,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/lib/toast";

export type InvoiceType = "acompte" | "solde" | "totale";
export type InvoiceStatus = "draft" | "pending" | "sent";

export interface InvoiceView {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  acomptePercent: number | null;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  issuedAt: string | null;
  sentAt: string | null;
  quoteNumber: string | null;
  clientName: string;
  clientEmail: string | null;
}

const TYPE_LABEL: Record<InvoiceType, string> = {
  acompte: "Facture d'acompte",
  solde: "Facture de solde",
  totale: "Facture",
};

// Badges calqués sur ceux des devis : draft gris, pending ambre, sent vert.
const STATUS: Record<
  InvoiceStatus,
  { label: string; icon: typeof Clock; color: string }
> = {
  draft: {
    label: "Brouillon",
    icon: Edit3,
    color: "text-gray-600 bg-gray-100 border-gray-200",
  },
  pending: {
    label: "En attente",
    icon: Clock,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  sent: {
    label: "Envoyée",
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
};

function fmtEuros(n: number): string {
  return `${(n ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function InvoicePreview({ invoice }: { invoice: InvoiceView }) {
  const router = useRouter();
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [sentAt, setSentAt] = useState<string | null>(invoice.sentAt);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const statusMeta = STATUS[status] ?? STATUS.pending;
  const StatusIcon = statusMeta.icon;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
  const canSend = status === "pending" && !!invoice.clientEmail;

  const typeLabel =
    invoice.type === "acompte" && invoice.acomptePercent
      ? `${TYPE_LABEL.acompte} (${invoice.acomptePercent}%)`
      : TYPE_LABEL[invoice.type];

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent_at?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Erreur ${res.status}`);
      }
      setStatus("sent");
      setSentAt(data.sent_at ?? new Date().toISOString());
      setConfirmOpen(false);
      toastSuccess("Facture envoyée au client ✓");
      router.refresh();
    } catch (e) {
      toastError((e as Error).message ?? "Envoi impossible. Réessaie.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Barre d'action */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/factures"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Mes factures
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {invoice.invoiceNumber}
          </span>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
              statusMeta.color,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {status === "sent" && sentAt
              ? `Envoyée le ${fmtDate(sentAt)}`
              : statusMeta.label}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${pdfUrl}?download=1`}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Télécharger le PDF
          </a>
          {status === "pending" && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend}
              title={
                canSend ? undefined : "Le client n'a pas d'email renseigné"
              }
              className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Envoyer la facture
            </button>
          )}
        </div>
      </div>

      {/* Infos clés */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 sm:grid-cols-4">
        <Info label="Type" value={typeLabel} />
        <Info label="Client" value={invoice.clientName || "—"} />
        <Info label="Montant TTC" value={fmtEuros(invoice.totalTtc)} strong />
        <Info label="Émise le" value={fmtDate(invoice.issuedAt)} />
        <Info
          label="Dont HT / TVA"
          value={`${fmtEuros(invoice.totalHt)} / ${fmtEuros(invoice.totalTva)}`}
        />
        {invoice.quoteNumber && (
          <Info label="Réf. devis" value={invoice.quoteNumber} />
        )}
      </div>

      {/* Aperçu PDF inline */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <iframe
          src={pdfUrl}
          title={`Aperçu facture ${invoice.invoiceNumber}`}
          className="h-[78vh] w-full"
        />
      </div>

      {/* Modale de confirmation d'envoi */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !sending) setConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Envoyer la facture ?
              </h2>
              <button
                type="button"
                onClick={() => !sending && setConfirmOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)]"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Cette facture sera envoyée par email avec le PDF en pièce jointe.
              Vérifie les informations avant d&apos;envoyer.
            </p>
            <dl className="my-4 space-y-2 rounded-xl bg-[var(--surface)] p-4 text-sm">
              <Row label="Facture" value={`${invoice.invoiceNumber} · ${typeLabel}`} />
              <Row label="Destinataire" value={invoice.clientEmail ?? "—"} />
              <Row label="Montant TTC" value={fmtEuros(invoice.totalTtc)} />
            </dl>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? "Envoi…" : "Confirmer l'envoi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm",
          strong
            ? "font-bold text-[var(--text-primary)]"
            : "text-[var(--text-secondary)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="truncate font-medium text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
