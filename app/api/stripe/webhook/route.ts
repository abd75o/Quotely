import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[webhook] Event received:", event.type);

  // ── checkout.session.completed ─────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    console.log("[webhook] userId from metadata:", userId ?? "(missing)");
    console.log("[webhook] plan from metadata:", session.metadata?.plan ?? "(missing)");

    // Primary source: plan stored in metadata during checkout creation
    let plan = session.metadata?.plan as "starter" | "pro" | undefined;

    // Fallback: resolve plan from the purchased price_id
    if (!plan) {
      console.log("[webhook] plan missing in metadata — resolving from line_items");
      const full = await getStripe().checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });
      const priceId = full.line_items?.data?.[0]?.price?.id ?? "";
      console.log("[webhook] price_id from line_items:", priceId || "(empty)");

      if (priceId && priceId === process.env.STRIPE_STARTER_MONTHLY_PRICE_ID) {
        plan = "starter";
      } else if (priceId && priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
        plan = "pro";
      }

      console.log("[webhook] plan resolved from price_id:", plan ?? "(unresolved)");
    }

    if (!userId || !plan) {
      console.error("[webhook] Cannot update profile — userId or plan missing after all fallbacks");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("profiles")
      .update({
        plan,
        trial_ends_at: null,
        stripe_customer_id: session.customer as string | null,
        stripe_subscription_id: session.subscription as string | null,
      })
      .eq("id", userId);

    if (error) {
      console.error("[webhook] Supabase update error:", error.message);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log(`[webhook] profiles.plan updated to '${plan}' for user ${userId}`);
  }

  // ── customer.subscription.deleted ──────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    console.log("[webhook] subscription.deleted — userId:", userId ?? "(missing)");

    if (userId) {
      await getSupabaseAdmin()
        .from("profiles")
        .update({ plan: "trial", trial_ends_at: null })
        .eq("id", userId);
      console.log(`[webhook] plan reset to 'trial' for user ${userId}`);
    }
  }

  return NextResponse.json({ received: true });
}
