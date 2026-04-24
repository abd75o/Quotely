"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Send,
  Edit3,
  Download,
  Copy,
  Check,
  Loader2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Client {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface Artisan {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  siret?: string;
}

interface Quote {
  id: string;
  number: string;
  status: string;
  items: QuoteItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  valid_until: string;
  created_at: string;
  notes?: string;
  public_token: string;
  signature_type: string;
  signed_at?: string;
  client?: Client | null;
  artisan?: Artisan | null;
}

const STATUS = {
  pending: { label: "En attente", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  signed: { label: "Signé", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  refused: { label: "Refusé", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
  invoiced: { label: "Facturé", icon: CheckCircle2, color: "text-violet-600 bg-violet-50 border-violet-200" },
} as const;

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function QuotePreview({ quote }: { quote: Quote }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signLink, setSignLink] = useState("");

  const status = STATUS[quote.status as keyof typeof STATUS] ?? STATUS.pending;
  const StatusIcon = status.icon;

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.signLink) setSignLink(data.signLink);
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    const link = signLink || `${window.location.origin}/devis/${quote.public_token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotes"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Mes devis
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{quote.number}</span>

          {/* Status badge */}
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", status.color)}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copié !" : "Copier le lien"}
          </button>
          <Link
            href={`/dashboard/quotes/${quote.id}/edit`}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl cursor-pointer transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Modifier
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          {quote.status === "pending" && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || sent}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-70 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sending ? "Envoi…" : sent ? "Envoyé !" : "Envoyer au client"}
            </button>
          )}
        </div>
      </div>

      {/* Sent confirmation */}
      {sent && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Email envoyé à {quote.client?.email}</p>
            <p className="text-xs text-emerald-600 truncate mt-0.5">
              Lien de signature : {signLink || `${typeof window !== "undefined" ? window.location.origin : ""}/devis/${quote.public_token}`}
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer flex-shrink-0"
          >
            Copier
          </button>
        </div>
      )}

      {/* Document */}
      <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* Doc header */}
        <div className="flex items-start justify-between p-8 pb-6 border-b border-[var(--border)]">
          <div>
            <Logo variant="horizontal" size={32} id="preview" />
            {quote.artisan && (
              <div className="mt-4 text-sm text-[var(--text-secondary)] space-y-0.5">
                {quote.artisan.company && <p className="font-semibold text-[var(--text-primary)]">{quote.artisan.company}</p>}
                <p>{quote.artisan.name}</p>
                <p>{quote.artisan.email}</p>
                {quote.artisan.phone && <p>{quote.artisan.phone}</p>}
                {quote.artisan.siret && <p className="text-xs text-[var(--text-muted)]">SIRET {quote.artisan.siret}</p>}
              </div>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">DEVIS</h1>
            <p className="text-sm font-mono text-[var(--text-secondary)] mt-1">{quote.number}</p>
            <div className="mt-3 text-sm text-[var(--text-secondary)] space-y-0.5">
              <p>Date : <span className="font-medium text-[var(--text-primary)]">{fmtDate(quote.created_at)}</span></p>
              <p>Valide jusqu'au : <span className="font-medium text-[var(--text-primary)]">{fmtDate(quote.valid_until)}</span></p>
            </div>
          </div>
        </div>

        {/* Client block */}
        {quote.client && (
          <div className="px-8 py-5">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Destinataire</p>
            <div className="p-4 bg-[var(--surface)] rounded-xl">
              <p className="font-semibold text-[var(--text-primary)]">{quote.client.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{quote.client.email}</p>
              {quote.client.phone && <p className="text-sm text-[var(--text-secondary)]">{quote.client.phone}</p>}
              {quote.client.address && <p className="text-sm text-[var(--text-secondary)] mt-1">{quote.client.address}</p>}
            </div>
          </div>
        )}

        {/* Line items table */}
        <div className="px-8 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3">Description</th>
                <th className="text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3 w-20">Qté</th>
                <th className="text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3 w-32">Prix unit. HT</th>
                <th className="text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3 w-32">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {quote.items.map((item) => (
                <tr key={item.id} className="group">
                  <td className="py-3.5 pr-4 text-sm text-[var(--text-primary)]">{item.description}</td>
                  <td className="py-3.5 text-sm text-center text-[var(--text-secondary)]">{item.quantity}</td>
                  <td className="py-3.5 text-sm text-right text-[var(--text-secondary)] tabular-nums">{fmt(item.unitPrice)} €</td>
                  <td className="py-3.5 text-sm text-right font-medium text-[var(--text-primary)] tabular-nums">{fmt(item.total)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 py-5 border-t border-[var(--border)]">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Sous-total HT</span>
                <span className="tabular-nums font-medium">{fmt(quote.subtotal)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">TVA ({quote.tax_rate}%)</span>
                <span className="tabular-nums font-medium">{fmt(quote.tax_amount)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-3 border-t-2 border-[var(--text-primary)]">
                <span>Total TTC</span>
                <span className="text-[var(--primary)] tabular-nums">{fmt(quote.total)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="px-8 py-5 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Notes & conditions</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Signature zone */}
        <div className="px-8 py-6 border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-col sm:flex-row items-start gap-6 justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[var(--primary)]" />
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Signature client</p>
              </div>
              {quote.status === "signed" && quote.signed_at ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Signé le {fmtDate(quote.signed_at)}
                </div>
              ) : (
                <div>
                  <div className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-sm text-[var(--text-muted)]">
                    Zone de signature
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Lien de signature : <span className="font-mono text-xs text-[var(--primary)]">/devis/{quote.public_token.slice(0, 8)}…</span>
                  </p>
                </div>
              )}
            </div>
            <div className="text-right text-xs text-[var(--text-muted)] space-y-1">
              <p className="font-semibold text-[var(--text-secondary)]">Bon pour accord</p>
              <p>Lu et approuvé</p>
              <p className="mt-4 text-[var(--primary)] font-medium">Quotely · quotely.fr</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
