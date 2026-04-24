import Stripe from "stripe";

// Stripe client — server-side only
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// ─── Price IDs (set via environment variables after Stripe setup) ─────────────
export const STRIPE_PRICES = {
  starter: { monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID! }, // 25€/mois
  pro:     { monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID! },     // 49€/mois
} as const;

// ─── Amount helpers (in euro cents) ──────────────────────────────────────────
export const PLAN_AMOUNTS = {
  starter: { monthly: 2500 },
  pro:     { monthly: 4900 },
} as const;

export const PLAN_NAMES = {
  starter: "Quotely Starter",
  pro:     "Quotely Pro",
} as const;

// ─── Create a checkout session ────────────────────────────────────────────────
export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId },
    },
    metadata: { userId },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });
}

// ─── Create Stripe products & prices (run once during setup) ─────────────────
export async function bootstrapStripeProducts() {
  const results: Record<string, string> = {};

  const plans = [
    { key: "starter", name: "Quotely Starter", monthly: 2500 },
    { key: "pro",     name: "Quotely Pro",     monthly: 4900 },
  ];

  for (const plan of plans) {
    const existingProducts = await stripe.products.list({ active: true });
    let product = existingProducts.data.find((p) => p.name === plan.name);

    if (!product) {
      product = await stripe.products.create({
        name: plan.name,
        metadata: { plan: plan.key },
      });
    }

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthly,
      currency: "eur",
      recurring: { interval: "month" },
      metadata: { plan: plan.key, billing: "monthly" },
    });
    results[`${plan.key}_monthly`] = monthlyPrice.id;
  }

  return results;
}
