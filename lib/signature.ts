import { getSignatureType } from "@/types/index";

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

// ─── Public token (used to build the public /sign/[token] URL) ────────────────
import crypto from "crypto";

export function generatePublicToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
