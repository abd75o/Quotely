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
}

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

  const signatureData = {
    full_name: body.full_name.trim(),
    email: body.email.trim(),
    ip,
    user_agent: userAgent,
    timestamp,
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
