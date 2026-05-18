import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, STRIPE_PRICES } from "@/lib/stripe";

export const metadata = { title: "Paiement — Quovi" };

export default async function PaiementPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  if (plan !== "starter" && plan !== "pro") {
    redirect("/tarifs");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?plan=${plan}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const priceId = STRIPE_PRICES[plan].monthly;

  let session;
  try {
    session = await createCheckoutSession({
      priceId,
      plan,
      userId: user.id,
      userEmail: user.email!,
      successUrl: `${appUrl}/dashboard?success=true`,
      cancelUrl: `${appUrl}/tarifs?cancelled=true`,
    });
  } catch (err: unknown) {
    // Log the full Stripe error before redirecting
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      console.error("[paiement] Stripe error type:", e.type);
      console.error("[paiement] Stripe error code:", e.code);
      console.error("[paiement] Stripe error message:", e.message);
      console.error("[paiement] Stripe error raw:", JSON.stringify(e, null, 2));
    } else {
      console.error("[paiement] Unknown error:", err);
    }
    redirect("/tarifs?error=stripe");
  }

  redirect(session!.url!);
}
