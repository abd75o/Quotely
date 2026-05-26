import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Pricing } from "@/components/landing/Pricing";
import { PricingFAQ } from "@/components/landing/PricingFAQ";
import { CTA } from "@/components/landing/CTA";
import { Reveal } from "@/components/ui/Reveal";
import { createClient } from "@/lib/supabase/server";
import type { UserStateValue } from "@/lib/hooks/useUserState";
import { PLAN_FEATURES } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Tarifs — Quovi",
  description: `Choisissez le plan Quovi adapté à votre activité. Plan Gratuit (${PLAN_FEATURES.free.maxDevisPerMonth} devis/mois), Starter 25€/mois ou Pro 49€/mois. Sans carte bancaire.`,
};

export default async function TarifsPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; error?: string }>;
}) {
  const { cancelled, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userState: UserStateValue = "visitor";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (profile?.plan === "starter") userState = "subscribed_starter";
    else if (profile?.plan === "pro") userState = "subscribed_pro";
    else userState = "subscribed_free";
  }

  const starterHref = user
    ? "/paiement?plan=starter"
    : "/inscription?plan=starter";
  const proHref = user ? "/paiement?plan=pro" : "/inscription?plan=pro";

  return (
    <>
      <Navbar />
      <main>
        {/* Hero court */}
        <section className="relative isolate overflow-hidden bg-[#FBFAF7] pt-32 pb-16 md:pt-40 md:pb-24">
          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <Reveal>
              <h1 className="font-display text-[36px] md:text-[52px] font-bold leading-[1.1] tracking-tight text-[var(--text-primary)]">
                Un prix simple. Aucun engagement.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                {userState === "visitor" && (
                  <>
                    Choisissez le plan qui correspond à votre activité.
                    Démarrez gratuitement, évoluez quand vous êtes prêt.
                  </>
                )}
                {userState === "subscribed_free" && (
                  <>
                    Vous êtes actuellement sur le plan Gratuit. Passez à
                    Starter ou Pro quand vous serez prêt.
                  </>
                )}
                {userState === "subscribed_starter" && (
                  <>
                    Vous êtes actuellement sur le plan Starter. Passez au Pro
                    pour débloquer plus de fonctionnalités.
                  </>
                )}
                {userState === "subscribed_pro" && (
                  <>
                    Vous êtes actuellement sur le plan Pro. Vous bénéficiez de
                    toutes les fonctionnalités.
                  </>
                )}
              </p>
            </Reveal>
          </div>
        </section>

        {/* Bannière paiement annulé */}
        {(cancelled === "true" || error === "stripe") && (
          <div className="bg-[#FBFAF7] py-6">
            <div className="max-w-3xl mx-auto px-6 lg:px-8">
              <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700">
                    Votre paiement n’a pas abouti
                  </p>
                  <p className="text-sm text-red-600 mt-0.5">
                    Réessayez ou choisissez un autre moyen de paiement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="relative isolate overflow-hidden bg-[#FBFAF7] py-16 md:py-24">
          <div className="relative mx-auto max-w-[1440px] px-6 lg:px-8">
            <Pricing
              starterHref={starterHref}
              proHref={proHref}
              showHeading={false}
              userState={userState}
              unwrapped
            />
          </div>
        </section>

        <PricingFAQ />

        <CTA
          secondaryHref="/#comment-ca-marche"
          secondaryLabel="Voir comment ça marche"
        />
      </main>
      <Footer />
    </>
  );
}
