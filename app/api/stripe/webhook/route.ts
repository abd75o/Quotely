import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type Stripe from "stripe";

// Raw body is required for Stripe signature verification.
// Next.js App Router reads it correctly via request.text().
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan   = session.metadata?.plan as "starter" | "pro" | undefined;

    if (!userId || !plan) {
      console.error("Webhook: missing userId or plan in metadata", session.metadata);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        plan,
        trial_ends_at: null,
        stripe_customer_id: session.customer as string | null,
        stripe_subscription_id: session.subscription as string | null,
      })
      .eq("id", userId);

    if (error) {
      console.error("Supabase profile update error:", error.message);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log(`Plan updated to '${plan}' for user ${userId}`);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (userId) {
      await supabaseAdmin
        .from("profiles")
        .update({ plan: "trial", trial_ends_at: null })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
