import type { SupabaseClient } from "@supabase/supabase-js";
import { sendQuoteEmail } from "@/lib/resend/send-quote";
import { checkProfileForSend } from "./send-helpers";
import type {
  PdfClient,
  PdfProfile,
  PdfQuote,
} from "@/lib/pdf/quote-template";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

interface QuoteItemRaw {
  id?: string;
  label?: string;
  price?: number;
  quantity?: number;
  unite?: string | null;
  tva?: number;
}

export interface SendQuoteOptions {
  supabase: SupabaseClient;
  userId: string;
  userEmail?: string | null;
  quoteId: string;
  customMessage?: string;
  appUrl: string;
}

export type SendQuoteResult =
  | { ok: true; messageId: string; signLink: string }
  | {
      ok: false;
      status: number;
      error: string;
      missing?: string[];
      /**
       * Set when the failure is due to an incomplete CLIENT (vs. artisan
       * profile). Lets the caller — Émile's sendQuote tool wrapper — open
       * the client edit modal with the right pre-fills instead of bouncing
       * the artisan to /dashboard/parametres for a profile fix.
       */
      clientIncomplete?: {
        clientId: string;
        missingFields: string[];
      };
      /**
       * Set when the artisan has not yet uploaded a signature. The Émile
       * tool wrapper surfaces this as a top-level status="missing_signature"
       * so the system prompt can branch into "ask + open signature modal"
       * without peeking at nested fields.
       */
      missingSignature?: true;
    };

export async function executeSendQuote(
  opts: SendQuoteOptions,
): Promise<SendQuoteResult> {
  const { supabase, userId, userEmail, quoteId, customMessage, appUrl } = opts;

  if (!process.env.RESEND_API_KEY) {
    console.error(
      "[SEND QUOTE] RESEND_API_KEY is missing — set it in .env.local",
    );
  }
  if (!process.env.RESEND_FROM_EMAIL) {
    console.error(
      "[SEND QUOTE] RESEND_FROM_EMAIL is missing — falling back to onboarding@resend.dev",
    );
  }

  const { data: quote, error: quoteErr } = await supabase
    .from("quotes")
    .select(
      "id, user_id, client_id, number, status, items, subtotal, tax_rate, tax_amount, total, valid_until, notes, signature_token, created_at, clients(*)",
    )
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (quoteErr) {
    console.error("[SEND QUOTE] DB error loading quote", quoteErr);
    return { ok: false, status: 500, error: quoteErr.message };
  }
  if (!quote) {
    console.error("[SEND QUOTE] Quote not found", { quoteId, userId });
    return { ok: false, status: 404, error: "Devis introuvable." };
  }

  const items = Array.isArray(quote.items)
    ? (quote.items as QuoteItemRaw[])
    : [];
  if (items.length === 0) {
    return {
      ok: false,
      status: 422,
      error:
        "Le devis est vide. Ajoute au moins une prestation avant d'envoyer.",
    };
  }

  if (!quote.client_id) {
    return {
      ok: false,
      status: 422,
      error: "Sélectionne un client avant d'envoyer.",
    };
  }

  const clientRow = Array.isArray(quote.clients)
    ? (quote.clients[0] as Record<string, unknown> | undefined)
    : ((quote.clients as Record<string, unknown> | null) ?? undefined);
  if (!clientRow || !clientRow.email) {
    return {
      ok: false,
      status: 422,
      error:
        "Le client n'a pas d'adresse email. Ajoute l'email avant l'envoi.",
    };
  }

  // Legal-conformity gate. A French devis must carry the recipient's full
  // address; for B2B it must also include the raison sociale (DB column
  // `name` for pros) and SIRET is strongly recommended. We block here
  // rather than at PDF render time so the artisan gets a structured
  // missing_fields list instead of a silently broken document.
  const clientType = clientRow.type_client as
    | "particulier"
    | "professionnel"
    | null
    | undefined;
  const clientMissing: string[] = [];
  if (!toStr(clientRow.address)) clientMissing.push("address");
  if (!toStr(clientRow.postal_code)) clientMissing.push("postal_code");
  if (!toStr(clientRow.city)) clientMissing.push("city");
  if (clientType === "professionnel") {
    if (!toStr(clientRow.name)) clientMissing.push("name");
  }
  if (clientMissing.length > 0) {
    return {
      ok: false,
      status: 422,
      error: `Client incomplet (${clientMissing.join(", ")}). Complète les infos avant l'envoi.`,
      clientIncomplete: {
        clientId: String(clientRow.id ?? quote.client_id),
        missingFields: clientMissing,
      },
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const profileCheck = checkProfileForSend(
    profile as Record<string, unknown> | null,
  );
  if (!profileCheck.ok) {
    return {
      ok: false,
      status: 422,
      error: `Profil incomplet (${profileCheck.missing.join(", ")}).`,
      missing: profileCheck.missing,
    };
  }

  // Signature artisan obligatoire avant tout envoi. The PDF would render
  // an empty "Bon pour accord — L'entreprise" cell otherwise, which is a
  // legal weak spot (no proof of consent from the artisan side). The Émile
  // wrapper turns this status into the open_signature_modal flow.
  const profileSignatureUrl =
    (profile as Record<string, unknown> | null)?.signature_url ?? null;
  if (!profileSignatureUrl || typeof profileSignatureUrl !== "string") {
    return {
      ok: false,
      status: 422,
      error:
        "Signe ton entreprise une première fois (au doigt sur mobile ou à la souris sur ordinateur). Elle sera réutilisée sur tous tes devis.",
      missingSignature: true,
    };
  }

  if (!quote.signature_token) {
    console.error("[SEND QUOTE] Missing signature_token on quote", { quoteId });
    return {
      ok: false,
      status: 500,
      error:
        "Ce devis n'a pas de signature_token. Exécute la migration 20260516_quotes_tracking.sql.",
    };
  }

  // Payment config — read defensively (separate query) so the emailed PDF shows
  // the real acompte/échéancier once the migration is applied, and never breaks
  // the send if it isn't.
  let acompte_percent: number | null = null;
  let payment_terms: string | null = null;
  {
    const { data: pay } = await supabase
      .from("quotes")
      .select("acompte_percent, payment_terms")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .maybeSingle();
    if (pay) {
      const ap = (pay as { acompte_percent?: number | string | null })
        .acompte_percent;
      acompte_percent =
        typeof ap === "number" ? ap : ap != null ? Number(ap) : null;
      payment_terms =
        (pay as { payment_terms?: string | null }).payment_terms ?? null;
    }
  }

  const pdfQuote: PdfQuote = {
    number: quote.number as string,
    status: quote.status as string,
    created_at: quote.created_at as string,
    valid_until: (quote.valid_until as string | null) ?? null,
    items: items.map((it, idx) => ({
      id: String(it.id ?? `l-${idx}`),
      label: String(it.label ?? "Prestation"),
      quantity: Number(it.quantity ?? 1),
      unite: (it.unite ?? null) as string | null,
      price: Number(it.price ?? 0),
      tva: Number(it.tva ?? quote.tax_rate ?? 20),
    })),
    subtotal: Number(quote.subtotal),
    tax_rate: Number(quote.tax_rate),
    tax_amount: Number(quote.tax_amount),
    total: Number(quote.total),
    acompte_percent,
    payment_terms,
    notes: (quote.notes as string | null) ?? null,
  };

  const profileForPdf: PdfProfile = {
    ...((profile ?? {}) as Record<string, unknown>),
    email:
      (profile as Record<string, unknown> | null)?.email as string ??
      userEmail ??
      null,
  } as PdfProfile;

  const clientForPdf: PdfClient & { email: string } = {
    name: String(clientRow.name ?? ""),
    first_name: (clientRow.first_name as string | null) ?? null,
    company_name: (clientRow.company_name as string | null) ?? null,
    email: String(clientRow.email),
    phone: (clientRow.phone as string | null) ?? null,
    telephone: (clientRow.telephone as string | null) ?? null,
    address: (clientRow.address as string | null) ?? null,
    postal_code: (clientRow.postal_code as string | null) ?? null,
    city: (clientRow.city as string | null) ?? null,
    type_client:
      (clientRow.type_client as "particulier" | "professionnel" | null) ??
      null,
    siret: (clientRow.siret as string | null) ?? null,
    civility: (clientRow.civility as string | null) ?? null,
  };

  const signLink = `${appUrl}/sign/${quote.signature_token}`;

  const result = await sendQuoteEmail({
    quote: { ...pdfQuote, id: quote.id as string },
    profile: profileForPdf,
    client: clientForPdf,
    signLink,
    customMessage,
  });

  if (result.error || !result.messageId) {
    console.error("[SEND QUOTE] Send failed", result.error);
    return {
      ok: false,
      status: 500,
      error: result.error ?? "Envoi échoué.",
    };
  }

  const { error: updateErr } = await supabase
    .from("quotes")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_to_email: clientForPdf.email,
      resend_message_id: result.messageId,
    })
    .eq("id", quote.id)
    .eq("user_id", userId);
  if (updateErr) {
    console.error(
      "[SEND QUOTE] Mail sent but DB update failed",
      updateErr,
    );
  }

  // Fige l'émetteur : on persiste le profil EXACT utilisé pour le PDF envoyé.
  // Requête SÉPARÉE et best-effort — la colonne emitter_snapshot est ajoutée par
  // une migration ; si elle n'est pas encore appliquée, l'écriture échoue sans
  // jamais casser l'envoi (le mail est déjà parti). À partir de maintenant, le
  // PDF/la page de signature relisent ce snapshot au lieu du profil vivant.
  {
    const { error: snapErr } = await supabase
      .from("quotes")
      .update({ emitter_snapshot: profileForPdf })
      .eq("id", quote.id)
      .eq("user_id", userId);
    if (snapErr) {
      console.error(
        "[SEND QUOTE] emitter_snapshot persist failed (migration appliquée ?)",
        snapErr,
      );
    }
  }

  return {
    ok: true,
    messageId: result.messageId,
    signLink,
  };
}
