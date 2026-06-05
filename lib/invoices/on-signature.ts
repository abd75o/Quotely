import type { SupabaseClient } from "@supabase/supabase-js";
import { computeQuoteTotals, type QuoteItem } from "@/lib/quotes/items";
import { createInvoiceForUser, type Invoice, type InvoiceType } from "./create";

/**
 * Palier 2A — génération automatique de la facture à la signature du devis.
 *
 * Appelé en BEST-EFFORT depuis la route de signature, APRÈS le commit de la
 * signature : un échec ici ne doit jamais invalider la signature (le caller
 * enveloppe l'appel dans un try/catch). Aucun email, aucune notif, aucun PDF —
 * uniquement la ligne `invoices`.
 *
 * - Anti-doublon : si une facture existe déjà pour ce devis, on ne fait rien.
 * - Détection acompte : via `quotes.acompte_percent` (structuré). Sinon facture
 *   'totale' (toujours légalement valide).
 * - Montants ventilés EXACTEMENT comme le PDF (computeQuoteTotals + facteur).
 * - Émetteur = snapshot figé du devis ; fallback profil live si absent.
 * - Statut 'pending' (générée, pas encore envoyée).
 *
 * @returns la facture créée, ou null si rien n'a été fait (doublon, devis vide).
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

function toQuoteItem(it: RawItem): QuoteItem {
  return {
    id: String(it.id ?? ""),
    label: String(it.label ?? it.description ?? ""),
    quantity: Number(it.quantity ?? 0),
    unite: (it.unite ?? null) as string | null,
    price: Number(it.price ?? it.unitPrice ?? 0),
    tva: Number(it.tva ?? 0),
  };
}

export async function generateInvoiceForSignedQuote(
  admin: SupabaseClient,
  opts: { quoteId: string; userId: string },
): Promise<Invoice | null> {
  const { quoteId, userId } = opts;

  // 1) Anti-doublon : une facture existe déjà pour ce devis → ne rien recréer
  //    (re-signature / retry / double appel).
  const { data: existing, error: existErr } = await admin
    .from("invoices")
    .select("id")
    .eq("quote_id", quoteId)
    .limit(1);
  if (existErr) throw existErr;
  if (existing && existing.length > 0) return null;

  // 2) Lecture (défensive) des champs financiers du devis.
  const { data: quote, error: qErr } = await admin
    .from("quotes")
    .select("items, acompte_percent, emitter_snapshot")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (qErr) throw qErr;
  if (!quote) return null;

  const rawItems = Array.isArray(quote.items)
    ? (quote.items as RawItem[])
    : [];
  // 3) Totaux du devis — MÊME helper que le PDF (ventilation TVA par taux).
  const totals = computeQuoteTotals(rawItems.map(toQuoteItem));

  // 4) Détection acompte via la colonne structurée (fiable). 0 < pct < 100.
  const pctRaw = (quote as { acompte_percent?: number | string | null })
    .acompte_percent;
  const pct =
    pctRaw != null && Number.isFinite(Number(pctRaw)) ? Number(pctRaw) : 0;
  const isAcompte = pct > 0 && pct < 100;
  const type: InvoiceType = isAcompte ? "acompte" : "totale";

  // 5) Montants ventilés EXACTEMENT comme le PDF d'acompte (facteur sur la
  //    même base, arrondi au centime identique).
  const factor = isAcompte ? pct / 100 : 1;
  const totalHt = +(totals.subtotal * factor).toFixed(2);
  const totalTva = +(totals.taxAmount * factor).toFixed(2);
  const totalTtc = +(totals.total * factor).toFixed(2);

  // 6) Émetteur figé sur le devis ; fallback profil live SEULEMENT si absent.
  let emitterSnapshot =
    (quote as { emitter_snapshot?: Record<string, unknown> | null })
      .emitter_snapshot ?? null;
  if (!emitterSnapshot) {
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    emitterSnapshot = (profile as Record<string, unknown> | null) ?? null;
  }

  // 7) Création (numéro alloué atomiquement côté base), statut 'pending'.
  return createInvoiceForUser(admin, {
    userId,
    quoteId,
    type,
    status: "pending",
    emitterSnapshot,
    acomptePercent: isAcompte ? pct : null,
    acompteAmount: isAcompte ? totalTtc : null,
    totalHt,
    totalTva,
    totalTtc,
  });
}

/**
 * Palier 2B — poste un message d'Émile dans la conversation liée au devis pour
 * annoncer que la facture vient d'être générée à la signature.
 *
 * BEST-EFFORT : appelé depuis le même try/catch que la création de facture, un
 * échec ici (lève) est avalé par le caller → signature + facture intactes, le
 * client ne voit rien. À n'appeler QUE si une facture a réellement été créée.
 *
 * - Cible la conversation `related_quote_id` (la plus récente si plusieurs).
 * - Skip propre si aucune conversation liée (devis créé hors chat) : pas de
 *   conversation orpheline créée.
 * - Anti-doublon : ne reposte pas si un message mentionnant déjà ce numéro de
 *   facture existe dans la conversation (re-signature / course).
 * - Écrit via le client `admin` (le signataire est anonyme, RLS bypassée).
 */
function formatEurosFr(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(n) ? n : 0);
}

function buildInvoiceNoticeContent(
  invoice: Invoice,
  quoteNumber: string,
  clientName: string,
): string {
  if (invoice.type === "acompte") {
    return `✅ ${clientName} a signé le devis ${quoteNumber} ! J'ai généré la facture d'acompte ${invoice.invoice_number} (${formatEurosFr(invoice.total_ttc)}). Elle est prête à être envoyée.`;
  }
  return `✅ ${clientName} a signé le devis ${quoteNumber} ! J'ai préparé la facture ${invoice.invoice_number}. À toi de l'envoyer quand tu veux (à la commande ou en fin de travaux).`;
}

export async function postInvoiceSignatureNotice(
  admin: SupabaseClient,
  opts: {
    invoice: Invoice;
    quoteNumber: string;
    clientName: string;
    userId: string;
  },
): Promise<void> {
  const { invoice, quoteNumber, clientName, userId } = opts;
  if (!invoice.quote_id) return; // pas de devis lié → rien à rattacher

  // 1) Conversation liée au devis (la plus récente si plusieurs).
  const { data: convs, error: convErr } = await admin
    .from("conversations")
    .select("id")
    .eq("related_quote_id", invoice.quote_id)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (convErr) throw convErr;
  const conversationId = (convs?.[0]?.id as string | undefined) ?? null;
  // Pas de conversation liée (devis créé hors chat) → skip propre.
  if (!conversationId) return;

  // 2) Anti-doublon : notif de CETTE facture déjà postée dans la conversation ?
  const { data: existing, error: existErr } = await admin
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .ilike("content", `%${invoice.invoice_number}%`)
    .limit(1);
  if (existErr) throw existErr;
  if (existing && existing.length > 0) return;

  // 3) Poste le message d'Émile (role assistant) — persisté, visible au retour.
  const { error: insErr } = await admin.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: buildInvoiceNoticeContent(invoice, quoteNumber, clientName),
  });
  if (insErr) throw insErr;

  // 4) Remonte la conversation en tête de la sidebar au retour de l'artisan.
  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
