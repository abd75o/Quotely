import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Invoice numbering — sequential per artisan, per year.
 *
 *   Format: FAC-YYYY-NNNNN
 *     - FAC   : facture prefix.
 *     - YYYY  : year (4 digits), used to reset the counter each year.
 *     - NNNNN : zero-padded counter (≥ 5 digits, extends past 99999 naturally).
 *
 * Obligation légale (BOI-TVA-DECLA-30-20-20) : la suite des numéros de facture
 * doit être CONTINUE, sans trou ni doublon. Contrairement aux devis (qui
 * dérivent leur numéro de MAX(existant)+1 avec contrainte unique + retry), les
 * factures s'appuient sur un compteur dédié `invoice_counters` incrémenté de
 * façon ATOMIQUE côté base (UPSERT ... RETURNING sous verrou de ligne), et le
 * numéro n'est consommé qu'au moment où la facture est réellement insérée et
 * committée (fonction SQL create_invoice → voir lib/invoices/create.ts).
 *
 * On NE génère donc JAMAIS le numéro côté JS : tout passe par les fonctions SQL
 * SECURITY DEFINER, seules autorisées à toucher le compteur — un client ne peut
 * ni fabriquer un trou ni réutiliser un numéro.
 */

const PREFIX = "FAC-";
const SEQ_WIDTH = 5;

/**
 * Formatte un numéro de facture à partir de l'année et du rang. Pur (affichage
 * d'une facture existante, tests). L'attribution réelle d'un rang se fait
 * UNIQUEMENT côté base (atomique) — ne jamais formater un rang « deviné ».
 */
export function formatInvoiceNumber(year: number, sequence: number): string {
  return `${PREFIX}${year}-${String(sequence).padStart(SEQ_WIDTH, "0")}`;
}

/**
 * Alloue ATOMIQUEMENT le prochain numéro de facture pour l'artisan connecté et
 * le renvoie formaté ("FAC-2026-00001"). L'identité vient de auth.uid() côté
 * base (le client ne peut pas viser un autre artisan).
 *
 * ⚠️ CONSOMME un rang du compteur : à n'appeler que si une facture est créée
 * juste après. Pour créer une facture, préférer createInvoice() (lib/invoices/
 * create.ts) qui alloue ET insère dans la même transaction → aucun trou si
 * l'insertion échoue.
 *
 * @param year Optionnel — par défaut l'année courante (côté base).
 */
export async function nextInvoiceNumber(
  supabase: SupabaseClient,
  year?: number,
): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number", {
    p_year: year ?? null,
  });
  if (error) throw error;
  return data as string;
}
