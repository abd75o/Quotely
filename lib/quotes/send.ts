import type { SupabaseClient } from "@supabase/supabase-js";
import { sendQuoteEmail } from "@/lib/resend/send-quote";
import { checkProfileForSend } from "./send-helpers";
import type {
  PdfClient,
  PdfProfile,
  PdfQuote,
} from "@/lib/pdf/quote-template";

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

  if (!quote.signature_token) {
    console.error("[SEND QUOTE] Missing signature_token on quote", { quoteId });
    return {
      ok: false,
      status: 500,
      error:
        "Ce devis n'a pas de signature_token. Exécute la migration 20260516_quotes_tracking.sql.",
    };
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
    name: String(clientRow.name ?? "Client"),
    first_name: (clientRow.first_name as string | null) ?? null,
    email: String(clientRow.email),
    phone: (clientRow.phone as string | null) ?? null,
    address: (clientRow.address as string | null) ?? null,
    postal_code: (clientRow.postal_code as string | null) ?? null,
    city: (clientRow.city as string | null) ?? null,
    type_client:
      (clientRow.type_client as "particulier" | "professionnel" | null) ??
      null,
    siret: (clientRow.siret as string | null) ?? null,
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

  return {
    ok: true,
    messageId: result.messageId,
    signLink,
  };
}
