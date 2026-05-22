import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  sendQuoteSignedClientEmail,
  sendArtisanSignedNotification,
} from "@/lib/resend/send-quote";

export const runtime = "nodejs";
export const maxDuration = 30;

interface SignBody {
  signature_token: string;
  full_name: string;
  email: string;
  /** PNG data URL drawn on the SignaturePad canvas. Stored as-is in
   *  signature_data.signature_image_url; the PDF SignatureBlock reads
   *  the same field via @react-pdf <Image>. Optional for back-compat
   *  with any caller that hasn't been updated to send it yet (the row
   *  still gets signed_at and full_name; only the drawn-image side of
   *  the "Bon pour accord" block is missing). */
  signature_image?: string;
  /** "Bon pour travaux" — mention manuscrite recopiée par le client.
   *  Conservée verbatim dans signature_data.handwritten_mention pour
   *  l'audit en cas de litige. La validation côté front est tolérante
   *  (casse / espaces / accents), donc on stocke ce que l'utilisateur
   *  a vraiment tapé, pas la version normalisée. */
  handwritten_mention?: string;
}

const PNG_DATA_URL_RE = /^data:image\/png(?:;base64)?,(.+)$/;
// Cap mirrors /api/profile/signature: a 600×180 PNG sits at 5–20 KB,
// even pathological scribbles stay under 100 KB. Hard cap at 1 MB so a
// malicious client can't bloat the JSONB column.
const MAX_SIGNATURE_BYTES = 1 * 1024 * 1024;

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: SignBody;
  try {
    body = (await req.json()) as SignBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!body.signature_token || !body.full_name || !body.email) {
    return jsonResponse(
      { error: "signature_token, full_name et email requis" },
      400,
    );
  }
  if (body.full_name.trim().length < 2) {
    return jsonResponse({ error: "Nom invalide" }, 400);
  }
  if (!/\S+@\S+\.\S+/.test(body.email.trim())) {
    return jsonResponse({ error: "Email invalide" }, 400);
  }

  // Validate the drawn signature when present. We accept the legacy
  // text-only flow (no image) to keep older clients working, but a body
  // that DOES include a signature_image must be a valid, sub-cap PNG —
  // a JPEG or oversize blob means the front-end is broken and the row
  // would render a corrupt image in the PDF if we wrote it through.
  let signatureImageUrl: string | null = null;
  if (typeof body.signature_image === "string" && body.signature_image) {
    const match = PNG_DATA_URL_RE.exec(body.signature_image);
    if (!match) {
      return jsonResponse(
        { error: "Format de signature invalide — attendu data:image/png" },
        422,
      );
    }
    // Approximate byte length from the base64 payload — accurate to within
    // 3 bytes (padding). Cheap enough to skip the full decode.
    const approxBytes = Math.floor((match[1].length * 3) / 4);
    if (approxBytes > MAX_SIGNATURE_BYTES) {
      return jsonResponse(
        {
          error: `Signature trop lourde (${Math.round(
            approxBytes / 1024,
          )} KB, max 1 MB).`,
        },
        413,
      );
    }
    signatureImageUrl = body.signature_image;
  }

  // 1. Lecture via anon (RLS public select via signature_token)
  const supabase = await createClient();
  const { data: quote, error: fetchErr } = await supabase
    .from("quotes")
    .select(
      "id, user_id, number, total, signed_at, signature_token, signature_data, clients(*)",
    )
    .eq("id", id)
    .eq("signature_token", body.signature_token)
    .maybeSingle();

  if (fetchErr) return jsonResponse({ error: fetchErr.message }, 500);
  if (!quote) return jsonResponse({ error: "Devis introuvable" }, 404);

  // 2. Anti double-signature
  if (quote.signed_at) {
    const existing = quote.signature_data as Record<string, unknown> | null;
    return jsonResponse(
      {
        error: "Devis déjà signé",
        signed_at: quote.signed_at,
        full_name: (existing?.full_name as string | undefined) ?? null,
      },
      409,
    );
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? null;
  const timestamp = new Date().toISOString();

  const handwrittenMention =
    typeof body.handwritten_mention === "string"
      ? body.handwritten_mention.trim().slice(0, 200)
      : null;

  const signatureData = {
    full_name: body.full_name.trim(),
    email: body.email.trim(),
    ip,
    user_agent: userAgent,
    timestamp,
    // Field name expected by lib/pdf/quote-template.tsx — populated only
    // when the client actually drew (drawn signatures are the new flow,
    // text-only stays valid for the legacy path).
    ...(signatureImageUrl ? { signature_image_url: signatureImageUrl } : {}),
    // Audit trail: the literal "Bon pour travaux" string the client typed.
    // Capped at 200 chars to bound the JSONB write — anything longer is a
    // copy-paste mishap, not a legitimate mention.
    ...(handwrittenMention ? { handwritten_mention: handwrittenMention } : {}),
  };

  // 3. Update via admin (RLS UPDATE non publique)
  const admin = getSupabaseAdmin();
  const { error: updateErr } = await admin
    .from("quotes")
    .update({
      status: "signed",
      signed_at: timestamp,
      signature_data: signatureData,
    })
    .eq("id", id)
    .eq("signature_token", body.signature_token);

  if (updateErr) {
    return jsonResponse({ error: updateErr.message }, 500);
  }

  // 4. Notifications (best-effort, ne fait pas échouer la signature)
  const clientRow = Array.isArray(quote.clients)
    ? (quote.clients[0] as Record<string, unknown> | undefined)
    : ((quote.clients as Record<string, unknown> | null) ?? undefined);

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "first_name, last_name, company, company_name, telephone, couleur_principale",
    )
    .eq("id", quote.user_id as string)
    .maybeSingle();

  const { data: authUser } = await admin.auth.admin.getUserById(
    quote.user_id as string,
  );
  const artisanEmail = authUser?.user?.email ?? null;

  const company =
    (profile as Record<string, unknown> | null)?.company_name as string ||
    (profile as Record<string, unknown> | null)?.company as string ||
    [
      (profile as Record<string, unknown> | null)?.first_name as string,
      (profile as Record<string, unknown> | null)?.last_name as string,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Votre prestataire";
  const color =
    ((profile as Record<string, unknown> | null)?.couleur_principale as
      | string
      | undefined) || "#5B5BD6";

  const clientName =
    (clientRow?.first_name as string | undefined) ||
    (clientRow?.name as string | undefined) ||
    body.full_name.trim();

  // 4a. Confirmation au client (mail depuis l'entreprise artisan)
  await sendQuoteSignedClientEmail({
    to: body.email.trim(),
    company,
    clientName,
    quoteNumber: quote.number as string,
    total: Number(quote.total),
    signedAt: timestamp,
    color,
    replyTo: artisanEmail ?? undefined,
  });

  // 4b. Notification à l'artisan
  if (artisanEmail) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    await sendArtisanSignedNotification({
      to: artisanEmail,
      artisanName:
        ((profile as Record<string, unknown> | null)?.first_name as string) ||
        company,
      clientName,
      quoteNumber: quote.number as string,
      total: Number(quote.total),
      dashboardUrl: `${appUrl}/dashboard/devis/${id}`,
    });
  }

  return jsonResponse({
    success: true,
    signed_at: timestamp,
    full_name: signatureData.full_name,
  });
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
