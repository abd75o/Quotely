import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, STRIPE_PRICES } from "@/lib/stripe";

export const runtime = "nodejs";

type Plan = "starter" | "pro";

/**
 * Creates a Stripe Checkout Session in EMBEDDED ui mode. The client receives
 * the session's client_secret and renders the checkout inside an
 * `<EmbeddedCheckout/>` mounted in the UpgradeModal — the user never leaves
 * the dashboard.
 *
 * This route is parallel to /api/stripe/checkout (which returns a hosted URL
 * for the legacy /tarifs flow). Both can coexist.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = (await request.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== "starter" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = STRIPE_PRICES[plan as Plan]?.monthly;
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Tarif Stripe non configuré. Demandez à l'administrateur de définir STRIPE_STARTER_MONTHLY_PRICE_ID et STRIPE_PRO_MONTHLY_PRICE_ID.",
      },
      { status: 503 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  // Reuse the user's stripe_customer_id if we already have one; otherwise
  // let Stripe create one from `customer_email` and capture it back via the
  // webhook (checkout.session.completed already persists it to profiles).
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const existingCustomerId =
    (profile as { stripe_customer_id?: string | null } | null)
      ?.stripe_customer_id ?? null;

  try {
    const session = await getStripe().checkout.sessions.create({
      // Stripe SDK v22 names the embedded-checkout flow "embedded_page"
      // (older docs called it "embedded"). The React EmbeddedCheckout
      // component reads the client_secret returned by either.
      ui_mode: "embedded_page",
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Existing customer if known → keeps the same payment_method history,
      // else create from email. Don't pass both — Stripe rejects that.
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: user.email ?? undefined }),
      subscription_data: {
        metadata: { userId: user.id, plan },
      },
      metadata: { userId: user.id, plan },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      // `{CHECKOUT_SESSION_ID}` is replaced by Stripe before redirect. The
      // dashboard parametres page reads `upgrade=success` and shows a toast.
      return_url: `${origin}/dashboard/parametres/facturation?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!session.client_secret) {
      console.error("[billing] embedded session has no client_secret", session.id);
      return NextResponse.json(
        { error: "Stripe n'a pas renvoyé de client_secret." },
        { status: 500 },
      );
    }

    return NextResponse.json({ client_secret: session.client_secret });
  } catch (err: unknown) {
    const e = (err ?? {}) as Record<string, unknown>;
    console.error("[billing] Stripe create session error:", {
      type: e.type,
      code: e.code,
      message: e.message,
    });
    return NextResponse.json(
      { error: "Création de la session de paiement impossible." },
      { status: 500 },
    );
  }
}
