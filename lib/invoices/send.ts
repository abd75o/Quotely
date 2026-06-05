import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoicePdfById } from "./pdf";
import { sendInvoiceEmail } from "@/lib/resend/send-invoice";
import { formatClientName, formatCompanyName, formatFullName } from "@/lib/text/name-normalize";
import type { InvoiceType } from "./create";

export interface SendInvoiceResult {
  ok: boolean;
  status: number;
  error?: string;
  sent_at?: string;
}

const DEFAULT_COLOR = "#5B5BD6";

function companyFromSnapshot(snap: Record<string, unknown>): string {
  const company = String(snap.company_name || snap.company || "").trim();
  if (company) return formatCompanyName(company);
  const person = formatFullName(
    snap.first_name as string | null | undefined,
    snap.last_name as string | null | undefined,
  );
  return person || "Votre prestataire";
}

/**
 * Envoie une facture par email au client (PDF en pièce jointe) puis passe son
 * statut pending → sent. Calqué sur executeSendQuote. OWNER : lit/écrit via le
 * client session (RLS), donc l'artisan ne peut envoyer que SES factures.
 */
export async function executeSendInvoice(opts: {
  supabase: SupabaseClient;
  userId: string;
  invoiceId: string;
}): Promise<SendInvoiceResult> {
  const { supabase, userId, invoiceId } = opts;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, type, status, acompte_percent, total_ttc, quote_id, emitter_snapshot",
    )
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!invoice) return { ok: false, status: 404, error: "Facture introuvable." };

  // Idempotence : seule une facture 'pending' peut être envoyée (anti double-envoi).
  if (invoice.status !== "pending") {
    return {
      ok: false,
      status: 409,
      error: "Cette facture a déjà été envoyée.",
    };
  }
  if (!invoice.quote_id) {
    return {
      ok: false,
      status: 422,
      error: "Facture sans devis lié — destinataire introuvable.",
    };
  }

  // Client (email + nom) depuis le devis d'origine.
  const { data: quote } = await supabase
    .from("quotes")
    .select("client:clients(name, first_name, email)")
    .eq("id", invoice.quote_id as string)
    .maybeSingle();
  const clientRow = quote
    ? Array.isArray(quote.client)
      ? (quote.client[0] as Record<string, unknown> | undefined)
      : ((quote.client as Record<string, unknown> | null) ?? undefined)
    : undefined;
  const clientEmail = (clientRow?.email as string | null | undefined) ?? null;
  if (!clientEmail) {
    return {
      ok: false,
      status: 422,
      error:
        "Le client n'a pas d'adresse email. Ajoute-la avant d'envoyer la facture.",
    };
  }
  const clientName = formatClientName({
    first_name: clientRow?.first_name as string | null | undefined,
    name: clientRow?.name as string | null | undefined,
  });

  // PDF (même générateur que l'aperçu).
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateInvoicePdfById(supabase, invoiceId);
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: `PDF: ${(e as Error).message ?? "génération échouée"}`,
    };
  }

  // Émetteur figé sur la facture → en-tête/footer du mail.
  const snap = (invoice.emitter_snapshot ?? {}) as Record<string, unknown>;
  const company = companyFromSnapshot(snap);
  const color =
    (snap.couleur_principale as string | null | undefined) ||
    (snap.brand_color as string | null | undefined) ||
    DEFAULT_COLOR;

  const res = await sendInvoiceEmail({
    to: clientEmail,
    company,
    clientName,
    invoiceNumber: invoice.invoice_number as string,
    type: invoice.type as InvoiceType,
    acomptePercent: (invoice.acompte_percent as number | null) ?? null,
    totalTtc: Number(invoice.total_ttc ?? 0),
    color,
    pdfBuffer,
    replyTo: (snap.email as string | null | undefined) ?? undefined,
    logoUrl: (snap.logo_url as string | null | undefined) ?? null,
    address: (snap.address as string | null | undefined) ?? null,
    postalCode: (snap.postal_code as string | null | undefined) ?? null,
    city: (snap.city as string | null | undefined) ?? null,
    email: (snap.email as string | null | undefined) ?? null,
    telephone: (snap.telephone as string | null | undefined) ?? null,
  });

  if (res.error || !res.messageId) {
    return { ok: false, status: 500, error: res.error ?? "Envoi échoué." };
  }

  // Succès → statut 'sent' + sent_at.
  const sentAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: sentAt })
    .eq("id", invoiceId)
    .eq("user_id", userId);
  if (updErr) {
    // Le mail EST parti ; on loggue mais on renvoie succès (le statut sera
    // corrigeable, ne pas faire croire à un échec d'envoi).
    console.error("[SEND INVOICE] mail envoyé mais update statut échoué", updErr);
  }

  return { ok: true, status: 200, sent_at: sentAt };
}
