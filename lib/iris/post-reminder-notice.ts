import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReminderStage, ReminderContext } from "@/emails/ReminderEmail";

// Transparence côté artisan : à chaque relance envoyée par Iris, poster un
// message d'Émile dans la conversation liée au devis. BEST-EFFORT (try/catch
// isolé par le caller). Écrit via le client `admin` (le cron n'a pas de session).
// Calqué sur postInvoiceSignatureNotice / postSoldeNotice (paliers 2b/4).

const STAGE_LABEL: Record<ReminderStage, string> = {
  j3: "J+3",
  j7: "J+7",
  j14: "J+14 (dernière relance)",
};

export async function postReminderNotice(
  admin: SupabaseClient,
  opts: {
    quoteId: string;
    userId: string;
    quoteNumber: string;
    clientName: string;
    stage: ReminderStage;
    context: ReminderContext;
  },
): Promise<void> {
  const { quoteId, userId, quoteNumber, clientName, stage, context } = opts;

  // Conversation liée au devis (la plus récente si plusieurs).
  const { data: convs, error: convErr } = await admin
    .from("conversations")
    .select("id")
    .eq("related_quote_id", quoteId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (convErr) throw convErr;
  const conversationId = (convs?.[0]?.id as string | undefined) ?? null;
  if (!conversationId) return; // devis hors chat → skip propre

  const ctx =
    context === "viewed"
      ? "il avait consulté le devis sans le signer"
      : "il n'avait pas encore ouvert le devis";
  const client = clientName || "le client";
  const content = `📨 J'ai relancé ${client} pour le devis ${quoteNumber} (relance ${STAGE_LABEL[stage]} — ${ctx}). Je lui ai renvoyé le lien de signature.`;

  const { error: insErr } = await admin.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content,
  });
  if (insErr) throw insErr;

  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
