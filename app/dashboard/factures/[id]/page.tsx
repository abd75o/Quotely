import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatClientName } from "@/lib/text/name-normalize";
import { InvoicePreview, type InvoiceView } from "@/components/invoices/InvoicePreview";

export const dynamic = "force-dynamic";

async function getInvoice(id: string): Promise<InvoiceView | null> {
  try {
    const supabase = await createClient();
    // RLS owner : un artisan ne lit que SES factures.
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, type, status, acompte_percent, total_ht, total_tva, total_ttc, issued_at, sent_at, quote_id",
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !invoice) return null;

    // Devis lié → numéro QVI + client (nom/email) pour l'affichage et l'envoi.
    let quoteNumber: string | null = null;
    let clientName = "";
    let clientEmail: string | null = null;
    if (invoice.quote_id) {
      const { data: quote } = await supabase
        .from("quotes")
        .select("number, client:clients(name, first_name, email)")
        .eq("id", invoice.quote_id as string)
        .maybeSingle();
      if (quote) {
        quoteNumber = (quote.number as string | null) ?? null;
        const c = Array.isArray(quote.client)
          ? (quote.client[0] as Record<string, unknown> | undefined)
          : ((quote.client as Record<string, unknown> | null) ?? undefined);
        if (c) {
          clientName = formatClientName({
            first_name: c.first_name as string | null | undefined,
            name: c.name as string | null | undefined,
          });
          clientEmail = (c.email as string | null) ?? null;
        }
      }
    }

    return {
      id: invoice.id as string,
      invoiceNumber: invoice.invoice_number as string,
      type: invoice.type as InvoiceView["type"],
      status: invoice.status as InvoiceView["status"],
      acomptePercent: (invoice.acompte_percent as number | null) ?? null,
      totalHt: Number(invoice.total_ht ?? 0),
      totalTva: Number(invoice.total_tva ?? 0),
      totalTtc: Number(invoice.total_ttc ?? 0),
      issuedAt: (invoice.issued_at as string | null) ?? null,
      sentAt: (invoice.sent_at as string | null) ?? null,
      quoteNumber,
      clientName,
      clientEmail,
    };
  } catch (e) {
    console.error("[factures/[id]] getInvoice failed:", e);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const invoice = await getInvoice(id);
  return {
    title: invoice
      ? `Facture ${invoice.invoiceNumber} — Quovi`
      : "Facture introuvable — Quovi",
  };
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <InvoicePreview invoice={invoice} />
    </div>
  );
}
