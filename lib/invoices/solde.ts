import type { SupabaseClient } from "@supabase/supabase-js";
import { computeQuoteTotals, type QuoteItem } from "@/lib/quotes/items";
import { createInvoice, type Invoice } from "./create";

/**
 * Palier 4 — génération de la facture de SOLDE depuis un devis signé.
 *
 * Contrairement à la génération d'acompte (faite à la signature par un
 * signataire ANONYME → service_role / createInvoiceForUser), le solde est une
 * action de l'ARTISAN CONNECTÉ. On reste donc 100% sur le client `supabase` de
 * session : RLS owner pour les lectures, `createInvoice` (auth.uid) pour
 * l'insertion. Aucune API publique, aucun service_role ici.
 *
 * Gardes (dans l'ordre) :
 *   - devis introuvable (RLS) → 404
 *   - devis non signé        → 422
 *   - pas d'acompte préalable → 422 (un solde n'a de sens qu'après un acompte)
 *   - solde déjà existant     → 409 (anti-doublon, renvoie l'id existant)
 *
 * Montants ventilés EXACTEMENT comme le PDF de solde (computeQuoteTotals sur les
 * items du devis × facteur (100 − pct)/100) → la ligne stockée correspond pile
 * à ce que le PDF affiche (« Reste dû TTC »).
 */

export interface GenerateSoldeResult {
  ok: boolean;
  status: number;
  error?: string;
  invoice?: Invoice;
  /** En cas de 409 : l'id de la facture de solde déjà existante. */
  existingSoldeId?: string;
}

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

function formatEurosFr(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(n) ? n : 0);
}

export async function executeGenerateSolde(opts: {
  supabase: SupabaseClient;
  userId: string;
  quoteId: string;
}): Promise<GenerateSoldeResult> {
  const { supabase, userId, quoteId } = opts;

  // 1) Devis de l'artisan (RLS owner). eq user_id en plus = défense en profondeur.
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("id, number, status, items, acompte_percent, emitter_snapshot")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (qErr) return { ok: false, status: 500, error: qErr.message };
  if (!quote) return { ok: false, status: 404, error: "Devis introuvable." };

  // 2) Le devis doit être signé.
  if (quote.status !== "signed") {
    return {
      ok: false,
      status: 422,
      error: "Le devis doit être signé pour générer une facture de solde.",
    };
  }

  // 3) Factures existantes du devis : il FAUT un acompte, il NE FAUT PAS de solde.
  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, type")
    .eq("quote_id", quoteId)
    .eq("user_id", userId);
  if (invErr) return { ok: false, status: 500, error: invErr.message };

  const hasAcompte = (invoices ?? []).some((i) => i.type === "acompte");
  const existingSolde = (invoices ?? []).find((i) => i.type === "solde");

  if (!hasAcompte) {
    return {
      ok: false,
      status: 422,
      error:
        "Aucune facture d'acompte pour ce devis — pas de solde à générer.",
    };
  }
  // 4) Anti-doublon solde.
  if (existingSolde) {
    return {
      ok: false,
      status: 409,
      error: "Une facture de solde existe déjà pour ce devis.",
      existingSoldeId: existingSolde.id as string,
    };
  }

  // 5) Montants — MÊME helper que le PDF, ventilation par taux, facteur solde.
  const pctRaw = (quote as { acompte_percent?: number | string | null })
    .acompte_percent;
  const pct =
    pctRaw != null && Number.isFinite(Number(pctRaw)) ? Number(pctRaw) : 0;
  if (!(pct > 0 && pct < 100)) {
    // Cohérence : un acompte existe mais le % du devis est absent/aberrant.
    return {
      ok: false,
      status: 422,
      error: "Pourcentage d'acompte invalide sur le devis.",
    };
  }

  const rawItems = Array.isArray(quote.items)
    ? (quote.items as RawItem[])
    : [];
  const totals = computeQuoteTotals(rawItems.map(toQuoteItem));

  // factor = part NON couverte par l'acompte. Identique au PDF (type 'solde').
  const factor = (100 - pct) / 100;
  const totalHt = +(totals.subtotal * factor).toFixed(2);
  const totalTva = +(totals.taxAmount * factor).toFixed(2);
  const totalTtc = +(totals.total * factor).toFixed(2);
  // Montant déjà versé (acompte) — sert au bandeau « … TTC déjà versé ».
  const acompteTtc = +(totals.total * (pct / 100)).toFixed(2);

  // 6) Émetteur figé sur le devis ; fallback profil live si absent.
  let emitterSnapshot =
    (quote as { emitter_snapshot?: Record<string, unknown> | null })
      .emitter_snapshot ?? null;
  if (!emitterSnapshot) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    emitterSnapshot = (profile as Record<string, unknown> | null) ?? null;
  }

  // 7) Création (auth.uid, numéro alloué atomiquement), statut 'pending'.
  let invoice: Invoice;
  try {
    invoice = await createInvoice(supabase, {
      quoteId,
      type: "solde",
      status: "pending",
      emitterSnapshot,
      acomptePercent: pct,
      acompteAmount: acompteTtc,
      totalHt,
      totalTva,
      totalTtc,
    });
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: `Création de la facture échouée : ${(e as Error).message ?? "inconnue"}`,
    };
  }

  return { ok: true, status: 200, invoice };
}

/**
 * Poste une notif d'Émile dans la conversation liée au devis pour annoncer la
 * facture de solde. BEST-EFFORT : appelée dans un try/catch isolé par le caller,
 * un échec ici n'invalide jamais la création de la facture.
 *
 * Calquée sur postInvoiceSignatureNotice (palier 2b), mais via le client SESSION
 * (l'artisan est connecté), pas service_role. Skip propre si pas de conversation
 * liée ; anti-doublon par numéro de facture déjà mentionné.
 */
export async function postSoldeNotice(
  supabase: SupabaseClient,
  opts: { invoice: Invoice; quoteNumber: string; userId: string },
): Promise<void> {
  const { invoice, quoteNumber, userId } = opts;
  if (!invoice.quote_id) return;

  const { data: convs, error: convErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("related_quote_id", invoice.quote_id)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (convErr) throw convErr;
  const conversationId = (convs?.[0]?.id as string | undefined) ?? null;
  if (!conversationId) return;

  // Anti-doublon : notif de CETTE facture déjà postée ?
  const { data: existing, error: existErr } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .ilike("content", `%${invoice.invoice_number}%`)
    .limit(1);
  if (existErr) throw existErr;
  if (existing && existing.length > 0) return;

  const content = `✅ Tu as généré la facture de solde ${invoice.invoice_number} pour le devis ${quoteNumber} (${formatEurosFr(invoice.total_ttc)}). Reste à l'envoyer quand tu veux. [OPEN_INVOICE:${invoice.id}]`;

  const { error: insErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content,
  });
  if (insErr) throw insErr;

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
