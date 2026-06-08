import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface TrackBody {
  signature_token: string;
}

// POST /api/quotes/[id]/track-view
// Appelé au montage de la page publique /sign (visiteur ANONYME). On écrit via
// le client admin (service_role) car le visiteur n'a pas de session : la seule
// policy UPDATE de `quotes` est owner, donc un UPDATE de session serait
// silencieusement bloqué par la RLS. Le `signature_token` (secret, non
// devinable) fait office d'autorisation — même modèle que le webhook Resend et
// la route de signature. Fire-and-forget : on ne renvoie jamais d'erreur 500
// qui bloquerait l'affichage de la page.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.signature_token) {
    return new Response(
      JSON.stringify({ error: "signature_token required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: quote, error } = await admin
      .from("quotes")
      .select("id, status, viewed_at, page_viewed_at, signature_token")
      .eq("id", id)
      .eq("signature_token", body.signature_token)
      .maybeSingle();
    if (error || !quote) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const update: Record<string, unknown> = {};
    // viewed_at + statut "Vu" : comportement existant (première vue seulement).
    if (!quote.viewed_at) {
      update.viewed_at = new Date().toISOString();
      if (quote.status === "sent") update.status = "viewed";
    }
    // page_viewed_at : signal FIABLE « a ouvert la page de signature ». Écrit
    // uniquement ici (jamais par le webhook email) → base de la relance
    // contextuelle d'Iris. Première vue seulement.
    if (!quote.page_viewed_at) {
      update.page_viewed_at = new Date().toISOString();
    }
    if (Object.keys(update).length > 0) {
      await admin.from("quotes").update(update).eq("id", id);
    }
  } catch (e) {
    // Admin indisponible (env manquante) ou erreur réseau : on ignore, le
    // tracking est best-effort et ne doit jamais casser la page /sign.
    console.error("[track-view] échec (non bloquant)", e);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
