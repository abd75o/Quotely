import type { Metadata } from "next";
import { AlertTriangle, XCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Pricing } from "@/components/landing/Pricing";
import { PricingFAQ } from "@/components/landing/PricingFAQ";
import { PricingCTA } from "@/components/landing/PricingCTA";
import { Reveal } from "@/components/ui/Reveal";
import { Highlight } from "@/components/ui/Highlight";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tarifs — Quotely",
  description:
    "Choisissez le plan Quotely adapté à votre activité. Starter 25€/mois ou Pro 49€/mois. 14 jours d’essai gratuit, sans carte bancaire.",
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

  let isTrialExpired = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, trial_ends_at")
      .eq("id", user.id)
      .single();
    if (
      profile?.plan === "trial" &&
      profile.trial_ends_at &&
      new Date(profile.trial_ends_at) < new Date()
    ) {
      isTrialExpired = true;
    }
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
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#FAFBFF] via-white to-[#FEF9F0] pt-32 pb-16 md:pt-40 md:pb-24">
          <div
            aria-hidden
            className="hidden md:block absolute top-0 right-0 w-[420px] h-[420px] -translate-y-1/3 translate-x-1/4 rounded-full bg-[var(--primary)] opacity-25 blur-3xl pointer-events-none -z-10"
          />
          <div
            aria-hidden
            className="hidden md:block absolute bottom-0 left-0 w-[380px] h-[380px] translate-y-1/4 -translate-x-1/4 rounded-3xl bg-[var(--accent-warm)] opacity-25 blur-3xl pointer-events-none -z-10"
          />

          <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
            <Reveal>
              <h1 className="font-display text-[36px] md:text-[52px] font-bold leading-[1.1] tracking-tight text-[var(--text-primary)]">
                Un prix simple. Aucun engagement.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                Choisissez le plan qui correspond à votre activité.{" "}
                <Highlight variant="warm">14 jours offerts</Highlight> pour
                tester.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Bannières d’état (paiement annulé, essai expiré) */}
        {(cancelled === "true" || error === "stripe" || isTrialExpired) && (
          <div className="bg-[var(--bg-secondary)] py-6">
            <div className="max-w-3xl mx-auto px-6 lg:px-8 space-y-3">
              {(cancelled === "true" || error === "stripe") && (
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
              )}

              {isTrialExpired && (
                <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-amber-800">
                    Votre essai gratuit est terminé — choisissez un plan pour
                    continuer à utiliser Quotely.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <Pricing
          starterHref={starterHref}
          proHref={proHref}
          showHeading={false}
        />

        <PricingFAQ />

        <PricingCTA />
      </main>
      <Footer />
    </>
  );
}
