import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/stripe/portal
 * Crée une session Stripe Customer Portal et renvoie l'URL.
 * Si l'utilisateur n'a pas encore de Stripe customer (pas d'abonnement),
 * renvoie 409 pour que le front affiche un toast adapté.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "no_customer", message: "Aucune méthode de paiement enregistrée." },
      { status: 409 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "stripe_not_configured", message: "Fonctionnalité disponible bientôt." },
      { status: 501 }
    );
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/parametres/facturation`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: "portal_error" }, { status: 500 });
  }
}
