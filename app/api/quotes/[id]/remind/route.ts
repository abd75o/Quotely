import { NextRequest } from "next/server";
import { sendReminderEmail, buildReminderProfile } from "@/lib/iris/reminder-email";
import type { ReminderStage } from "@/emails/ReminderEmail";

/**
 * POST /api/quotes/[id]/remind
 * Relance MANUELLE d'un devis par l'artisan (bouton). Réservé au plan Pro côté
 * UI ; l'auth + les RLS suffisent côté serveur (le devis doit appartenir au user).
 *
 * Utilise EXACTEMENT le même email anonymisé qu'Iris (From = artisan, reply-to
 * artisan, zéro mention Quovi) et écrit dans quote_reminders (source 'manual')
 * pour qu'Iris ne renvoie pas le même palier automatiquement.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: quote, error } = await supabase
      .from("quotes")
      .select(
        "id, number, total, status, sent_at, page_viewed_at, signature_token, emitter_snapshot, client:clients(name, first_name, email)",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !quote) {
      return Response.json({ error: "Devis introuvable" }, { status: 404 });
    }
    if (!["sent", "viewed"].includes(quote.status)) {
      return Response.json(
        { error: "Ce devis n'est plus en attente." },
        { status: 409 },
      );
    }
    const client = Array.isArray(quote.client) ? quote.client[0] : quote.client;
    const clientEmail = (client?.email as string | null) ?? null;
    if (!clientEmail) {
      return Response.json(
        { error: "Email du client manquant." },
        { status: 400 },
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const signLink = `${origin}/sign/${quote.signature_token}`;

    // Profil émetteur (snapshot figé du devis, repli sur profil live).
    // NB : `profiles` n'a pas de colonne email — l'email artisan vient de
    // auth.users (user.email), comme dans l'envoi de devis (lib/quotes/send.ts).
    const { data: profileRow } = await supabase
      .from("profiles")
      .select(
        "company_name, company, first_name, last_name, telephone, address, postal_code, city, logo_url, couleur_principale, brand_color",
      )
      .eq("id", user.id)
      .maybeSingle();
    const profile = buildReminderProfile(
      (quote.emitter_snapshot as Record<string, unknown> | null) ?? null,
      { ...((profileRow as Record<string, unknown> | null) ?? {}), email: user.email ?? null },
    );

    // Prochain palier non encore envoyé (sert au ton + à la trace anti-doublon).
    const { data: sent } = await supabase
      .from("quote_reminders")
      .select("stage")
      .eq("quote_id", id);
    const sentStages = new Set((sent ?? []).map((r) => r.stage as string));
    const stage: ReminderStage = !sentStages.has("j3")
      ? "j3"
      : !sentStages.has("j7")
        ? "j7"
        : "j14";

    const context = quote.page_viewed_at ? "viewed" : "not_viewed";

    const res = await sendReminderEmail({
      to: clientEmail,
      quote: { number: quote.number, total: Number(quote.total ?? 0) },
      profile,
      client: {
        name: (client?.name as string | null) ?? "",
        first_name: (client?.first_name as string | null) ?? null,
      },
      signLink,
      stage,
      context,
    });
    if (res.error || !res.messageId) {
      return Response.json(
        { error: res.error ?? "Envoi échoué." },
        { status: 502 },
      );
    }

    // Trace (best-effort) : permet à Iris de ne pas renvoyer ce palier.
    // Si le palier est déjà tracé (course), l'UNIQUE échoue → on ignore.
    const { error: insErr } = await supabase.from("quote_reminders").insert({
      quote_id: id,
      user_id: user.id,
      stage,
      context,
      source: "manual",
      email_to: clientEmail,
      resend_message_id: res.messageId,
    });
    if (insErr) {
      console.error("[quotes/remind] trace quote_reminders échouée", insErr);
    }

    return Response.json({ success: true, signLink });
  } catch (err) {
    console.error("[quotes/remind]", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
