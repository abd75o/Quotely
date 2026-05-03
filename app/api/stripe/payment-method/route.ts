import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * GET /api/stripe/payment-method
 * Renvoie un résumé de la carte par défaut du customer Stripe
 * (brand + last4) — utilisé par la page Facturation.
 *
 * - 200 { card: null } si aucune carte enregistrée.
 * - 501 si Stripe n'est pas configuré.
 */
export async function GET() {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ card: null });
  }

  try {
    const stripe = getStripe();
    const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
    const defaultPmId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id ?? null;

    let pm: Stripe.PaymentMethod | null = null;
    if (defaultPmId) {
      pm = await stripe.paymentMethods.retrieve(defaultPmId);
    } else {
      const list = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      pm = list.data[0] ?? null;
    }

    if (!pm?.card) {
      return NextResponse.json({ card: null });
    }

    return NextResponse.json({
      card: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      },
    });
  } catch (err) {
    console.error("[stripe/payment-method]", err);
    return NextResponse.json({ error: "payment_method_error" }, { status: 500 });
  }
}
