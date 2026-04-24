import { SignatureType, getSignatureType } from "@/types/index";

// ─── Signature type thresholds ────────────────────────────────────────────────
export const SIGNATURE_THRESHOLDS = {
  simple:          1_500, // < 1 500 € → simple (finger / name + checkbox)
  email_confirmed: 5_000, // 1 500–5 000 € → finger + email confirmation
  // > 5 000 € → YouSign eIDAS
} as const;

export { getSignatureType };

// ─── YouSign API ──────────────────────────────────────────────────────────────
const YOUSIGN_BASE_URL =
  process.env.YOUSIGN_SANDBOX === "true"
    ? "https://api-sandbox.yousign.app/v3"
    : "https://api.yousign.app/v3";

const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY;

interface YouSignProcedure {
  procedureId: string;
  signingUrl: string;
  status: "pending" | "signed" | "refused";
}

/**
 * Create a YouSign signing procedure for amounts > 5 000 €.
 * Returns a signing URL to redirect the client to.
 */
export async function createYouSignProcedure({
  quoteId,
  quoteNumber,
  pdfBase64,
  clientName,
  clientEmail,
  totalEuros,
  notifyUrl,
}: {
  quoteId: string;
  quoteNumber: string;
  pdfBase64: string;
  clientName: string;
  clientEmail: string;
  totalEuros: number;
  notifyUrl: string;
}): Promise<YouSignProcedure> {
  if (!YOUSIGN_API_KEY) {
    throw new Error("YOUSIGN_API_KEY is not configured");
  }

  // 1. Upload document
  const uploadRes = await fetch(`${YOUSIGN_BASE_URL}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YOUSIGN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Devis-${quoteNumber}.pdf`,
      content: pdfBase64,
      nature: "signable_document",
    }),
  });

  if (!uploadRes.ok) {
    throw new Error(`YouSign document upload failed: ${await uploadRes.text()}`);
  }
  const { id: documentId } = await uploadRes.json();

  // 2. Create signature request
  const sigReqRes = await fetch(`${YOUSIGN_BASE_URL}/signature_requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YOUSIGN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Devis ${quoteNumber} — ${totalEuros.toLocaleString("fr-FR")} €`,
      delivery_mode: "email",
      documents: [documentId],
      signers: [
        {
          info: { first_name: clientName.split(" ")[0], last_name: clientName.split(" ").slice(1).join(" ") || clientName, email: clientEmail },
          fields: [{ document_id: documentId, type: "signature", page: 1, x: 300, y: 700, width: 200, height: 60 }],
        },
      ],
      webhook_subscriptions: [
        { sandbox: process.env.YOUSIGN_SANDBOX === "true", event_name: "signer.done", endpoint: notifyUrl },
      ],
      metadata: { quoteId },
    }),
  });

  if (!sigReqRes.ok) {
    throw new Error(`YouSign signature request failed: ${await sigReqRes.text()}`);
  }
  const sigRequest = await sigReqRes.json();

  // 3. Activate
  await fetch(`${YOUSIGN_BASE_URL}/signature_requests/${sigRequest.id}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` },
  });

  return {
    procedureId: sigRequest.id,
    signingUrl: sigRequest.signers?.[0]?.signature_link ?? "",
    status: "pending",
  };
}

// ─── Email confirmation token ─────────────────────────────────────────────────
import crypto from "crypto";

export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generatePublicToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// ─── Notification helper (artisan notified when client signs) ─────────────────
export async function notifyArtisanSigned({
  artisanEmail,
  artisanName,
  clientName,
  quoteNumber,
  totalEuros,
  quoteUrl,
}: {
  artisanEmail: string;
  artisanName: string;
  clientName: string;
  quoteNumber: string;
  totalEuros: number;
  quoteUrl: string;
}) {
  // Uses Resend — configured in lib/resend.ts
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Quotely <notifications@quotely.fr>",
    to: artisanEmail,
    subject: `✅ ${clientName} a signé votre devis ${quoteNumber} — ${totalEuros.toLocaleString("fr-FR")} €`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <div style="background: #6366F1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; font-size: 20px; margin: 0;">Devis signé ! 🎉</h1>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Bonjour <strong>${artisanName}</strong>,
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Bonne nouvelle ! <strong>${clientName}</strong> vient de signer votre devis
          <strong>${quoteNumber}</strong> d'un montant de <strong>${totalEuros.toLocaleString("fr-FR")} €</strong>.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          La facture a été générée automatiquement et est disponible dans votre espace Quotely.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${quoteUrl}" style="background: #6366F1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Voir le devis signé →
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
          Quotely · <a href="https://quotely.fr" style="color: #6366F1;">quotely.fr</a>
        </p>
      </div>
    `,
  });
}
