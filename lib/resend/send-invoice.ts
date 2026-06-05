import InvoiceEmail, { type InvoiceEmailType } from "@/emails/InvoiceEmail";
import { getResend, resendFromAddress } from "./client";

export interface SendInvoiceEmailInput {
  to: string;
  company: string;
  clientName: string;
  invoiceNumber: string;
  type: InvoiceEmailType;
  acomptePercent?: number | null;
  totalTtc: number;
  color: string;
  pdfBuffer: Buffer;
  replyTo?: string;
  logoUrl?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  email?: string | null;
  telephone?: string | null;
  showBranding?: boolean;
}

export interface SendInvoiceEmailResult {
  messageId: string | null;
  error?: string;
}

// Sujet selon le type (acompte avec %, solde, totale).
function subjectFor(input: SendInvoiceEmailInput): string {
  const { type, invoiceNumber, acomptePercent, company } = input;
  if (type === "acompte") {
    const pct = acomptePercent ? ` (${acomptePercent}%)` : "";
    return `Votre facture d'acompte n°${invoiceNumber}${pct} — ${company}`;
  }
  if (type === "solde") {
    return `Votre facture de solde n°${invoiceNumber} — ${company}`;
  }
  return `Votre facture n°${invoiceNumber} — ${company}`;
}

export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendInvoiceEmailResult> {
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: resendFromAddress(input.company),
      replyTo: input.replyTo ?? undefined,
      to: input.to,
      subject: subjectFor(input),
      react: InvoiceEmail({
        company: input.company,
        clientName: input.clientName,
        invoiceNumber: input.invoiceNumber,
        type: input.type,
        acomptePercent: input.acomptePercent,
        totalTtc: input.totalTtc,
        color: input.color,
        logoUrl: input.logoUrl,
        address: input.address,
        postalCode: input.postalCode,
        city: input.city,
        email: input.email,
        telephone: input.telephone,
        showBranding: input.showBranding,
      }),
      attachments: [
        {
          filename: `Facture-${input.invoiceNumber}.pdf`,
          content: input.pdfBuffer,
        },
      ],
      tags: [{ name: "type", value: "invoice" }],
    });
    if (result.error) {
      console.error("[SEND INVOICE] Resend returned error", result.error);
      return { messageId: null, error: result.error.message };
    }
    return { messageId: result.data?.id ?? null };
  } catch (e) {
    console.error("[SEND INVOICE] Resend threw", e);
    return { messageId: null, error: (e as Error).message ?? "Envoi échoué" };
  }
}
