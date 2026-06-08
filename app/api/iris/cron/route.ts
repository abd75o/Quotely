import { NextRequest } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { runIrisReminders } from "@/lib/iris/engine";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// POST /api/iris/cron — déclenché 1×/jour par la Netlify Scheduled Function.
// Protégé par CRON_SECRET (header Authorization: Bearer <secret>). Lance le
// balayage de relances Iris via service_role. Idempotent (anti-doublon en base).
//
// Test manuel (sans attendre le cron) :
//   curl -X POST https://<app>/api/iris/cron \
//     -H "Authorization: Bearer $CRON_SECRET"

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Refus explicite : sans secret configuré, l'endpoint ne tourne pas (un
    // déclenchement public non protégé enverrait de vrais emails).
    return json({ error: "CRON_SECRET non configuré" }, 500);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !timingSafeEqualStr(token, secret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const admin = getSupabaseAdmin();
    const summary = await runIrisReminders(admin);
    return json({ ok: true, summary });
  } catch (e) {
    console.error("[IRIS CRON] échec du balayage", e);
    return json({ error: (e as Error).message ?? "Erreur serveur" }, 500);
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
