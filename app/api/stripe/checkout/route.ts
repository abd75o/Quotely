import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, STRIPE_PRICES } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { plan?: string };
  const plan = body.plan;

  if (plan !== "starter" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const priceId = STRIPE_PRICES[plan].monthly;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  console.log("[checkout] plan:", plan);
  console.log("[checkout] priceId:", priceId || "(empty)");
  console.log("[checkout] STRIPE_SECRET_KEY:", secretKey
    ? secretKey.slice(0, 7) + "..." + secretKey.slice(-4)
    : "(not set)");

  try {
    const session = await createCheckoutSession({
      priceId,
      plan,
      userId: user.id,
      userEmail: user.email!,
      successUrl: `${appUrl}/dashboard?success=true`,
      cancelUrl: `${appUrl}/tarifs?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      console.error("[checkout] Stripe error type:", e.type);
      console.error("[checkout] Stripe error code:", e.code);
      console.error("[checkout] Stripe error message:", e.message);
      console.error("[checkout] Stripe error raw:", JSON.stringify(e, null, 2));
    } else {
      console.error("[checkout] Unknown error:", err);
    }
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
}
