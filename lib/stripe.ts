import Stripe from "stripe";

// Lazy singleton — not instantiated at module load so the build never throws
// when STRIPE_SECRET_KEY is absent from the build environment.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

export const STRIPE_PRICES = {
  starter: { monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID! },
  pro:     { monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID! },
} as const;

export const PLAN_AMOUNTS = {
  starter: { monthly: 2500 },
  pro:     { monthly: 4900 },
} as const;

export const PLAN_NAMES = {
  starter: "Quotely Starter",
  pro:     "Quotely Pro",
} as const;

export async function createCheckoutSession({
  priceId,
  plan,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  plan: "starter" | "pro";
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "paypal"],
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { userId, plan },
    },
    metadata: { userId, plan },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });
}

export async function bootstrapStripeProducts() {
  const stripe = getStripe();
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
