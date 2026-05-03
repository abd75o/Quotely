import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/stripe/cancel
 * Programme l'annulation de l'abonnement à la fin de la période en cours.
 * (cancel_at_period_end = true). L'utilisateur garde l'accès jusqu'au
 * terme de la facturation.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "stripe_not_configured", message: "Fonctionnalité disponible bientôt." },
      { status: 501 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: string };

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  const subscriptionId = profile?.stripe_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "no_subscription", message: "Aucun abonnement actif à annuler." },
      { status: 409 }
    );
  }

  try {
    const updated = await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: body.reason ? { cancel_reason: body.reason } : undefined,
    });
    return NextResponse.json({
      ok: true,
      cancel_at: updated.cancel_at,
      current_period_end: updated.items.data[0]?.current_period_end,
    });
  } catch (err) {
    console.error("[stripe/cancel]", err);
    return NextResponse.json({ error: "cancel_error" }, { status: 500 });
  }
}
