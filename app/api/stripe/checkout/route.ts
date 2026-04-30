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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const session = await createCheckoutSession({
      priceId: STRIPE_PRICES[plan].monthly,
      plan,
      userId: user.id,
      userEmail: user.email!,
      successUrl: `${appUrl}/paiement/succes?plan=${plan}`,
      cancelUrl: `${appUrl}/tarifs`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
}
