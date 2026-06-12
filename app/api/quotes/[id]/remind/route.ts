import { NextRequest } from "next/server";
import { sendReminderEmail, buildReminderProfile } from "@/lib/iris/reminder-email";
import {
  computeReminderState,
  stageFromDaysSinceSent,
  REMINDER_COOLDOWN_HOURS,
  type ReminderRow,
} from "@/lib/iris/cooldown";

/**
 * /api/quotes/[id]/remind — relance MANUELLE d'un devis par l'artisan.
 *
 * GET  : état du bouton (canRemind, dates des dernières relances, cooldown).
 * POST : envoie la relance (email anonymisé identique à Iris) si le cooldown
 *        48h entre relances MANUELLES est écoulé. Une relance AUTO récente
 *        n'empêche RIEN (elle est seulement signalée à l'UI).
 *
 * Réservé au plan Pro côté UI ; l'auth + les RLS suffisent côté serveur (le
 * devis doit appartenir au user). Écrit dans quote_reminders (source 'manual')
 * pour qu'Iris coordonne sa propre cadence (cf. lib/iris/cooldown.ts).
 */

const REMINDABLE = ["sent", "viewed"];

function clientNameOf(c: unknown): string {
  const obj = (Array.isArray(c) ? c[0] : c) as
    | { name?: string | null; first_name?: string | null }
    | null;
  return (obj?.first_name || obj?.name || "le client").trim() || "le client";
}

async function loadReminderRows(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  quoteId: string,
): Promise<ReminderRow[]> {
  const { data } = await supabase
    .from("quote_reminders")
    .select("sent_at, source")
    .eq("quote_id", quoteId);
  return (data ?? []) as ReminderRow[];
}

async function getSupabase() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

// ─── GET : état du bouton ────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const supabase = await getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: quote } = await supabase
      .from("quotes")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!quote) {
      return Response.json({ error: "Devis introuvable" }, { status: 404 });
    }

    const statusRemindable = REMINDABLE.includes(quote.status as string);
    const state = computeReminderState(
      await loadReminderRows(supabase, id),
      Date.now(),
    );

    return Response.json({
      canRemind: statusRemindable && !state.manualCooldownActive,
      statusRemindable,
      lastManualAt: state.lastManualAt,
      lastAutoAt: state.lastAutoAt,
      hoursUntilAllowed: state.hoursUntilAllowed,
      lastAutoHoursAgo:
        state.lastAutoHoursAgo === null
          ? null
          : Math.floor(state.lastAutoHoursAgo),
      cooldownHours: REMINDER_COOLDOWN_HOURS,
    });
  } catch (err) {
    console.error("[quotes/remind GET]", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ─── POST : envoi de la relance ──────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const supabase = await getSupabase();

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
    if (!REMINDABLE.includes(quote.status)) {
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

    // Anti-spam : 48h DUR entre deux relances MANUELLES. Une relance auto
    // récente ne bloque pas (l'artisan reste maître).
    const now = Date.now();
    const reminderRows = await loadReminderRows(supabase, id);
    const state = computeReminderState(reminderRows, now);
    if (state.manualCooldownActive) {
      return Response.json(
        {
          error: `Trop tôt : dernière relance il y a ${Math.floor(
            state.lastManualHoursAgo ?? 0,
          )}h. Attends encore ${state.hoursUntilAllowed}h.`,
          retryAfterHours: state.hoursUntilAllowed,
          lastManualHoursAgo: Math.floor(state.lastManualHoursAgo ?? 0),
        },
        { status: 409 },
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

    // Palier = ton de l'email, calculé par l'ancienneté du devis (et non par le
    // « prochain palier libre ») : une relance manuelle peut se répéter.
    const sentAtMs = quote.sent_at ? new Date(quote.sent_at).getTime() : now;
    const daysSinceSent = Math.floor((now - sentAtMs) / 86_400_000);
    const stage = stageFromDaysSinceSent(daysSinceSent);

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

    // Trace (source 'manual') : alimente le cooldown 48h et la coordination
    // avec Iris auto. L'unicité ne s'applique qu'aux relances auto désormais
    // (migration 20260609) → cet insert ne peut plus échouer sur un doublon.
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

    return Response.json({
      success: true,
      signLink,
      clientName: clientNameOf(quote.client),
    });
  } catch (err) {
    console.error("[quotes/remind]", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
