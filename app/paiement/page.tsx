import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, STRIPE_PRICES } from "@/lib/stripe";

export const metadata = { title: "Paiement — Quotely" };

// Intermediate server page: creates Stripe Checkout and hard-redirects there.
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
    redirect(`/connexion?redirect=/paiement?plan=${plan}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let session;
  try {
    session = await createCheckoutSession({
      priceId: STRIPE_PRICES[plan].monthly,
      plan,
      userId: user.id,
      userEmail: user.email!,
      successUrl: `${appUrl}/paiement/succes?plan=${plan}`,
      cancelUrl: `${appUrl}/tarifs`,
    });
  } catch {
    redirect("/tarifs?error=stripe");
  }

  redirect(session!.url!);
}
