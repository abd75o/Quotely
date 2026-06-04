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
