import { NextRequest } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface ResendEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[] | string;
    [key: string]: unknown;
  };
}

// Svix signs Resend webhooks. Headers: svix-id, svix-timestamp, svix-signature
function verifySvixSignature(
  payload: string,
  headers: Headers,
  secret: string,
): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // secret format: whsec_xxx — strip prefix and base64-decode the rest
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(raw, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedPayload)
    .digest("base64");

  // svix-signature header can contain multiple "v1,<sig> v1,<sig>" pairs
  const candidates = svixSignature
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("v1,") ? s.slice(3) : s));

  return candidates.some((c) => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(c, "base64"),
        Buffer.from(expected, "base64"),
      );
    } catch {
      return false;
    }
  });
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Si pas de secret configuré, on accepte tout (mode dev). En prod, configure-le.
  if (secret && !verifySvixSignature(payload, req.headers, secret)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(payload) as ResendEvent;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messageId = event.data?.email_id;
  if (!messageId) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = getSupabaseAdmin();

  if (event.type === "email.opened") {
    const { data: quote } = await admin
      .from("quotes")
      .select("id, status, viewed_at")
      .eq("resend_message_id", messageId)
      .maybeSingle();
    if (quote && !quote.viewed_at) {
      const update: Record<string, unknown> = {
        viewed_at: new Date().toISOString(),
      };
      if (quote.status === "sent") update.status = "viewed";
      await admin.from("quotes").update(update).eq("id", quote.id);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
