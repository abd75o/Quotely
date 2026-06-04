import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoicePdfBuffer } from "@/lib/pdf/generate";
import type { PdfClient, PdfProfile, QuoteLineRow } from "@/lib/pdf/quote-template";
import type { InvoicePdfData } from "@/lib/pdf/invoice-template";
import type { InvoiceType } from "./create";

/**
 * Génération du PDF d'une facture. Étape 2 du module Facture — produit le rendu
 * à partir d'une facture (et de son devis source). N'est appelé nulle part
 * automatiquement : helper prêt à l'emploi.
 *
 * Émetteur = emitter_snapshot figé sur la facture (comme le devis). Lignes +
 * client + n° de devis = récupérés depuis le devis d'origine (quote_id).
 */

interface RawItem {
  id?: string;
  label?: string;
  description?: string;
  quantity?: number;
  unite?: string | null;
  price?: number;
  unitPrice?: number;
  tva?: number;
}

/** Normalise les items JSONB d'un devis vers la shape attendue par le template. */
export function quoteItemsToLines(items: unknown): QuoteLineRow[] {
  if (!Array.isArray(items)) return [];
  return (items as RawItem[]).map((it, idx) => ({
    id: String(it.id ?? `l-${idx}`),
    label: String(it.label ?? it.description ?? "Prestation"),
    quantity: Number(it.quantity ?? 1),
    unite: (it.unite ?? null) as string | null,
    price: Number(it.price ?? it.unitPrice ?? 0),
    tva: Number(it.tva ?? 0),
  }));
}

function toClient(row: Record<string, unknown> | undefined): PdfClient {
  if (!row) return { name: "" };
  return {
    name: String(row.name ?? ""),
    first_name: (row.first_name as string | null) ?? null,
    company_name: (row.company_name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    telephone: (row.telephone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    type_client:
      (row.type_client as "particulier" | "professionnel" | null) ?? null,
    siret: (row.siret as string | null) ?? null,
    civility: (row.civility as string | null) ?? null,
  };
}

/**
 * Récupère la facture `invoiceId` (+ son devis), assemble les données et rend le
 * PDF. RLS s'applique via le client Supabase passé (l'artisan ne voit que ses
 * factures).
 */
export async function generateInvoicePdfById(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<Buffer> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, quote_id, invoice_number, issued_at, type, acompte_percent, emitter_snapshot",
    )
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) throw error;
  if (!invoice) throw new Error("Facture introuvable");

  let quoteNumber: string | null = null;
  let lines: QuoteLineRow[] = [];
  let clientRow: Record<string, unknown> | undefined;
  if (invoice.quote_id) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("number, items, clients(*)")
      .eq("id", invoice.quote_id as string)
      .maybeSingle();
    if (quote) {
      quoteNumber = (quote.number as string | null) ?? null;
      lines = quoteItemsToLines(quote.items);
      clientRow = Array.isArray(quote.clients)
        ? (quote.clients[0] as Record<string, unknown> | undefined)
        : ((quote.clients as Record<string, unknown> | null) ?? undefined);
    }
  }

  // Émetteur figé sur la facture (jamais le profil live ici).
  const profile = (invoice.emitter_snapshot ?? {}) as PdfProfile;

  const invoiceData: InvoicePdfData = {
    invoice_number: invoice.invoice_number as string,
    issued_at: invoice.issued_at as string,
    type: invoice.type as InvoiceType,
    acompte_percent: (invoice.acompte_percent as number | null) ?? null,
    quote_number: quoteNumber,
    items: lines,
  };

  return generateInvoicePdfBuffer({
    invoice: invoiceData,
    profile,
    client: toClient(clientRow),
  });
}
