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

    // ── Affiliate + parrainage conversion on first payment ──────────────────
    // Best-effort: errors here must NOT fail the webhook (Stripe would retry
    // and we'd re-update the plan, which is fine but noisy).
    try {
      await handleFirstPaymentAttribution(userId);
    } catch (e) {
      console.error("[webhook] attribution-on-payment failed:", e);
    }
  }

  // ── customer.subscription.updated ──────────────────────────────────────────
  // Fires when the customer changes plan from the Stripe Customer Portal
  // (e.g. upgrades from Starter → Pro outside of our embedded checkout).
  // We resolve the new plan from the price_id on the active subscription item
  // and write it back so profiles.plan stays the source of truth.
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    const priceId = subscription.items?.data?.[0]?.price?.id ?? "";
    let plan: "starter" | "pro" | null = null;
    if (priceId === process.env.STRIPE_STARTER_MONTHLY_PRICE_ID) plan = "starter";
    else if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) plan = "pro";

    console.log("[webhook] subscription.updated — userId:", userId ?? "(missing)", "plan:", plan ?? "(unknown)");

    if (userId && plan) {
      const { error } = await getSupabaseAdmin()
        .from("profiles")
        .update({ plan, stripe_subscription_id: subscription.id })
        .eq("id", userId);
      if (error) {
        console.error("[webhook] subscription.updated DB error:", error.message);
      } else {
        console.log(`[webhook] plan synced to '${plan}' for user ${userId}`);
      }
    }
  }

  // ── customer.subscription.deleted ──────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    console.log("[webhook] subscription.deleted — userId:", userId ?? "(missing)");

    if (userId) {
      // Downgrade to `free`, NOT `trial` — the 14-day trial was retired in
      // May 2026 and `trial` is no longer in the profiles.plan CHECK
      // constraint (see migration 20260513_freemium_signup.sql). Writing
      // `trial` would 500 on the DB.
      await getSupabaseAdmin()
        .from("profiles")
        .update({ plan: "free", trial_ends_at: null })
        .eq("id", userId);
      console.log(`[webhook] plan reset to 'free' for user ${userId}`);
    }
  }

  return NextResponse.json({ received: true });
}

/**
 * On a user's first paid checkout:
 *  - Mark the affiliate_referrals row as having received first payment (so
 *    commission accrual starts on the next billing cycle).
 *  - Convert the referrals row (parrainage) from 'pending' to 'converted'
 *    and grant +1 month of credit to BOTH the referrer and the referred.
 *
 * Idempotent: relies on `first_payment_date IS NULL` / `status = 'pending'`
 * filters so repeated webhook deliveries don't double-credit.
 */
async function handleFirstPaymentAttribution(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  // 1. Affiliate attribution timestamp
  await admin
    .from("affiliate_referrals")
    .update({ first_payment_date: new Date().toISOString() })
    .eq("referred_user_id", userId)
    .is("first_payment_date", null);

  // 2. Parrainage conversion
  const { data: ref } = await admin
    .from("referrals")
    .select("id, referrer_id, referred_id, status")
    .eq("referred_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!ref) return;

  const now = new Date().toISOString();
  await admin
    .from("referrals")
    .update({
      status: "rewarded",
      first_payment_date: now,
      reward_granted_at: now,
    })
    .eq("id", ref.id);

  // +1 month for each of the referrer and the referred. Read-then-write is
  // fine here — these events fire at most once per user per checkout.
  await Promise.all(
    [ref.referrer_id, userId].map(async (uid) => {
      const { data: rp } = await admin
        .from("profiles")
        .select("referral_credits_months")
        .eq("id", uid)
        .maybeSingle();
      const current = rp?.referral_credits_months ?? 0;
      await admin
        .from("profiles")
        .update({ referral_credits_months: current + 1 })
        .eq("id", uid);
    }),
  );
}
