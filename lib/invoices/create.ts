import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Création de facture — fondation (étape 1 du module Facture).
 *
 * createInvoice() délègue à la fonction SQL `create_invoice` (SECURITY DEFINER)
 * qui, dans UNE SEULE transaction : alloue atomiquement le prochain numéro
 * (compteur dédié, sans trou ni doublon), vérifie la propriété du devis lié, et
 * insère la ligne `invoices`. Le numéro n'est consommé que si la facture est
 * committée → conforme à l'obligation légale de suite continue.
 *
 * Pour l'instant cette fonction n'est appelée nulle part automatiquement : elle
 * est prête à l'emploi pour la suite (génération depuis un devis signé, etc.).
 */

export type InvoiceType = "acompte" | "solde" | "totale";
export type InvoiceStatus = "draft" | "pending" | "sent";

/** Ligne `invoices` telle que renvoyée par la base. */
export interface Invoice {
  id: string;
  user_id: string;
  quote_id: string | null;
  invoice_number: string;
  invoice_year: number;
  sequence_number: number;
  type: InvoiceType;
  status: InvoiceStatus;
  emitter_snapshot: Record<string, unknown> | null;
  acompte_percent: number | null;
  acompte_amount: number | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  issued_at: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceParams {
  /** Devis d'origine (doit appartenir à l'artisan connecté). Optionnel. */
  quoteId?: string | null;
  type: InvoiceType;
  /** Par défaut "draft". */
  status?: InvoiceStatus;
  /** Snapshot émetteur figé (même shape que quotes.emitter_snapshot). */
  emitterSnapshot?: Record<string, unknown> | null;
  acomptePercent?: number | null;
  acompteAmount?: number | null;
  totalHt?: number;
  totalTva?: number;
  totalTtc?: number;
  /** Date d'émission (ISO "YYYY-MM-DD"). Par défaut la date du jour (côté base). */
  issuedAt?: string | null;
}

/**
 * Crée une facture pour l'artisan connecté. Le numéro (FAC-YYYY-NNNNN) est
 * attribué atomiquement côté base au moment de l'insertion.
 */
export async function createInvoice(
  supabase: SupabaseClient,
  params: CreateInvoiceParams,
): Promise<Invoice> {
  const { data, error } = await supabase.rpc("create_invoice", {
    p_quote_id: params.quoteId ?? null,
    p_type: params.type,
    p_status: params.status ?? "draft",
    p_emitter_snapshot: params.emitterSnapshot ?? null,
    p_acompte_percent: params.acomptePercent ?? null,
    p_acompte_amount: params.acompteAmount ?? null,
    p_total_ht: params.totalHt ?? 0,
    p_total_tva: params.totalTva ?? 0,
    p_total_ttc: params.totalTtc ?? 0,
    p_issued_at: params.issuedAt ?? null,
  });
  if (error) throw error;
  // create_invoice RETURNS public.invoices → une seule ligne.
  return (Array.isArray(data) ? data[0] : data) as Invoice;
}

export interface CreateInvoiceForUserParams extends CreateInvoiceParams {
  /** Propriétaire de la facture (le devis doit lui appartenir). */
  userId: string;
}

/**
 * Variante SERVEUR/SYSTÈME : crée une facture pour un `userId` EXPLICITE, sans
 * dépendre de auth.uid(). À utiliser avec un client service_role (ex. depuis la
 * route de signature, où le signataire est anonyme). Délègue à la fonction SQL
 * create_invoice_for_user (réservée au service_role) — même allocation atomique
 * du numéro et même vérification de propriété du devis.
 */
export async function createInvoiceForUser(
  admin: SupabaseClient,
  params: CreateInvoiceForUserParams,
): Promise<Invoice> {
  const { data, error } = await admin.rpc("create_invoice_for_user", {
    p_user_id: params.userId,
    p_quote_id: params.quoteId ?? null,
    p_type: params.type,
    p_status: params.status ?? "pending",
    p_emitter_snapshot: params.emitterSnapshot ?? null,
    p_acompte_percent: params.acomptePercent ?? null,
    p_acompte_amount: params.acompteAmount ?? null,
    p_total_ht: params.totalHt ?? 0,
    p_total_tva: params.totalTva ?? 0,
    p_total_ttc: params.totalTtc ?? 0,
    p_issued_at: params.issuedAt ?? null,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as Invoice;
}
