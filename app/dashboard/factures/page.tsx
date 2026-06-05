import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatClientName } from "@/lib/text/name-normalize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Factures — Quovi" };

type InvoiceStatus = "draft" | "pending" | "sent";
type InvoiceType = "acompte" | "solde" | "totale";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  total_ttc: number;
  issued_at: string | null;
  clientName: string;
}

const TYPE_LABEL: Record<InvoiceType, string> = {
  acompte: "Acompte",
  solde: "Solde",
  totale: "Totale",
};

const STATUS_BADGE: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "text-gray-600 bg-gray-100 border-gray-200" },
  pending: { label: "En attente", cls: "text-amber-600 bg-amber-50 border-amber-200" },
  sent: { label: "Envoyée", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

function fmtEuros(n: number): string {
  return `${(n ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const p = new Date(d);
  if (Number.isNaN(p.getTime())) return "—";
  return p.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function getInvoices(): Promise<InvoiceRow[]> {
  try {
    const supabase = await createClient();
    // RLS owner. Tri date desc, LIMIT 50 (pas de filtres ni pagination ici).
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, type, status, total_ttc, issued_at, created_at, quote:quotes(client:clients(name, first_name))",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[factures] list error:", error.message);
      return [];
    }
    return (data ?? []).map((row) => {
      const quote = Array.isArray(row.quote) ? row.quote[0] : row.quote;
      const c = quote
        ? Array.isArray(quote.client)
          ? quote.client[0]
          : quote.client
        : null;
      const clientName = c
        ? formatClientName({
            first_name: (c as Record<string, unknown>).first_name as
              | string
              | null
              | undefined,
            name: (c as Record<string, unknown>).name as
              | string
              | null
              | undefined,
          })
        : "";
      return {
        id: row.id as string,
        invoice_number: row.invoice_number as string,
        type: row.type as InvoiceType,
        status: row.status as InvoiceStatus,
        total_ttc: Number(row.total_ttc ?? 0),
        issued_at: (row.issued_at as string | null) ?? null,
        clientName,
      };
    });
  } catch (e) {
    console.error("[factures] getInvoices failed:", e);
    return [];
  }
}

export default async function InvoicesListPage() {
  const invoices = await getInvoices();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
          <Receipt className="h-5 w-5 text-[var(--primary)]" />
          Factures
        </h1>

        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            Aucune facture pour le moment. Une facture est générée
            automatiquement quand un client signe un devis.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {invoices.map((inv) => {
                  const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={inv.id} className="hover:bg-[var(--surface)]">
                      <td className="px-4 py-3 font-mono text-[12px] text-[var(--text-primary)]">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {inv.clientName || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {TYPE_LABEL[inv.type]}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--text-primary)]">
                        {fmtEuros(inv.total_ttc)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] tabular-nums">
                        {fmtDate(inv.issued_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/factures/${inv.id}`}
                          className="text-sm font-semibold text-[var(--primary)] hover:underline"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
