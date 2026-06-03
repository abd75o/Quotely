import QuoteEmail from "@/emails/QuoteEmail";
import QuoteSignedEmail from "@/emails/QuoteSignedEmail";
import ArtisanSignedNotification from "@/emails/ArtisanSignedNotification";
import { getResend, resendFromAddress } from "./client";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate";
import { shouldShowBranding } from "@/lib/branding/should-show";
import { formatCompanyName, formatFullName } from "@/lib/text/name-normalize";
import type {
  PdfClient,
  PdfProfile,
  PdfQuote,
} from "@/lib/pdf/quote-template";

export interface SendQuoteEmailInput {
  quote: PdfQuote & { id: string };
  profile: PdfProfile;
  client: PdfClient & { email: string };
  signLink: string;
  customMessage?: string;
}

export interface SendQuoteEmailResult {
  messageId: string | null;
  error?: string;
}

function companyDisplay(p: PdfProfile): string {
  const company = (p.company_name || p.company || "").trim();
  if (company) return formatCompanyName(company);
  const person = formatFullName(p.first_name, p.last_name);
  return person || "Devis";
}

/**
 * Map a raw Resend error message to a French, actionable one. The sandbox
 * mode (no verified domain on the Resend account) returns a long English
 * sentence the artisan can't parse — surface a clean copy instead, with
 * the path to the fix. We keep the original message in console.error
 * upstream for diagnostics.
 */
function translateResendError(raw: string): string {
  const m = raw.toLowerCase();
  if (
    m.includes("you can only send testing emails to your own email address") ||
    m.includes("verify a domain") ||
    (m.includes("domain") && m.includes("verif"))
  ) {
    return "Mode test Resend : ton domaine n'est pas encore vérifié, l'email n'a pu être envoyé qu'à ta propre adresse. Vérifie ton domaine sur resend.com (Settings → Domains) pour envoyer à tes clients.";
  }
  if (m.includes("invalid api key") || m.includes("missing api key")) {
    return "Clé API Resend invalide ou absente. Vérifie RESEND_API_KEY dans la configuration.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Trop d'envois en peu de temps (rate-limit Resend). Réessaie dans quelques minutes.";
  }
  return raw;
}

export async function sendQuoteEmail(
  input: SendQuoteEmailInput,
): Promise<SendQuoteEmailResult> {
  const { quote, profile, client, signLink, customMessage } = input;
  const company = companyDisplay(profile);
  const showBranding = shouldShowBranding(profile.plan, profile.hide_branding);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateQuotePdfBuffer({ quote, profile, client });
  } catch (e) {
    console.error("[SEND QUOTE] PDF generation failed", e);
    return {
      messageId: null,
      error: `PDF: ${(e as Error).message ?? "génération échouée"}`,
    };
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: resendFromAddress(company),
      replyTo: profile.email ?? undefined,
      to: client.email,
      subject: `Votre devis n°${quote.number} — ${company}`,
      react: QuoteEmail({
        quote,
        profile,
        client,
        signLink,
        customMessage,
        showBranding,
      }),
      attachments: [
        {
          filename: `Devis-${quote.number}.pdf`,
          content: pdfBuffer,
        },
      ],
      tags: [
        { name: "type", value: "quote" },
        { name: "quote_id", value: quote.id.replace(/[^A-Za-z0-9_-]/g, "_") },
      ],
    });
    if (result.error) {
      console.error("[SEND QUOTE] Resend returned error", result.error);
      return {
        messageId: null,
        error: translateResendError(result.error.message),
      };
    }
    return { messageId: result.data?.id ?? null };
  } catch (e) {
    const raw = (e as Error).message ?? "Envoi Resend échoué";
    console.error("[SEND QUOTE] Resend threw", e);
    return {
      messageId: null,
      error: translateResendError(raw),
    };
  }
}

export async function sendQuoteSignedClientEmail(opts: {
  to: string;
  company: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  signedAt: string;
  color?: string;
  replyTo?: string;
}): Promise<SendQuoteEmailResult> {
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: resendFromAddress(opts.company),
      replyTo: opts.replyTo,
      to: opts.to,
      subject: `Devis n°${opts.quoteNumber} signé — ${opts.company}`,
      react: QuoteSignedEmail({
        company: opts.company,
        clientName: opts.clientName,
        quoteNumber: opts.quoteNumber,
        total: opts.total,
        signedAt: opts.signedAt,
        color: opts.color,
      }),
      tags: [
        { name: "type", value: "quote_signed_client" },
      ],
    });
    if (result.error) {
      return { messageId: null, error: result.error.message };
    }
    return { messageId: result.data?.id ?? null };
  } catch (e) {
    return {
      messageId: null,
      error: (e as Error).message ?? "Envoi confirmation échoué",
    };
  }
}

export async function sendArtisanSignedNotification(opts: {
  to: string;
  artisanName: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  dashboardUrl: string;
}): Promise<SendQuoteEmailResult> {
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: resendFromAddress("Quovi"),
      to: opts.to,
      subject: `${opts.clientName} a signé votre devis n°${opts.quoteNumber}`,
      react: ArtisanSignedNotification({
        artisanName: opts.artisanName,
        clientName: opts.clientName,
        quoteNumber: opts.quoteNumber,
        total: opts.total,
        dashboardUrl: opts.dashboardUrl,
      }),
      tags: [{ name: "type", value: "artisan_signed_notification" }],
    });
    if (result.error) {
      return { messageId: null, error: result.error.message };
    }
    return { messageId: result.data?.id ?? null };
  } catch (e) {
    return {
      messageId: null,
      error: (e as Error).message ?? "Notification artisan échouée",
    };
  }
}
