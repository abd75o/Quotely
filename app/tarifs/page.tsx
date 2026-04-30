import type { Metadata } from "next";
import Link from "next/link";
import { Check, Zap, Star, ArrowRight, Sparkles, Shield, AlertTriangle, XCircle } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tarifs — Quotely",
  description: "Choisissez le plan Quotely adapté à votre activité. Starter 25€/mois ou Pro 49€/mois.",
};

const STARTER_FEATURES = [
  "Templates prêts à l'emploi (par métier)",
  "Devis en 30 secondes (5 champs seulement)",
  "TVA calculée automatiquement",
  "Lien de signature envoyé en 1 clic",
  "Signature en ligne (simple ou par email)",
  "Suivi en temps réel (signé, en attente, refusé)",
  "Facture générée automatiquement après signature",
  "30 devis/mois",
  "Support par email (réponse sous 24h)",
];

const PRO_FEATURES = [
  "Tout le plan Starter inclus",
  "Devis en 10 secondes par dictée vocale",
  "Rédaction automatique des prestations par IA",
  "Tarifs du marché suggérés",
  "Signature certifiée eIDAS (YouSign)",
  "Relances automatiques (zéro oubli)",
  "Tableau de bord revenus en temps réel",
  "Score de signature (sache ce qui marche)",
  "Devis illimités",
  "Support prioritaire — réponse sous 1h",
];

export default async function TarifsPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; error?: string }>;
}) {
  const { cancelled, error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  const starterHref = user ? "/paiement?plan=starter" : "/inscription?plan=starter";
  const proHref     = user ? "/paiement?plan=pro"     : "/inscription?plan=pro";

  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href={user ? "/dashboard/quotes" : "/"}>
            <Logo variant="horizontal" size={30} />
          </Link>
          {user && (
            <Link
              href="/dashboard/quotes"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Retour au dashboard
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">

          {/* Paiement annulé ou refusé */}
          {(cancelled === "true" || error === "stripe") && (
            <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl mb-8 max-w-2xl mx-auto">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">
                  Votre paiement n'a pas abouti
                </p>
                <p className="text-sm text-red-600 mt-0.5">
                  Réessayez ou choisissez un autre moyen de paiement.
                </p>
              </div>
            </div>
          )}

          {/* Essai expiré */}
          {isTrialExpired && (
            <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl mb-8 max-w-2xl mx-auto">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-800">
                Votre essai gratuit est terminé — choisissez un plan pour continuer à utiliser Quotely.
              </p>
            </div>
          )}

          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-bg)] text-[var(--primary)] text-xs font-semibold rounded-full mb-4">
              <Zap className="w-3.5 h-3.5" />
              Tarifs simples et transparents
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
              Choisissez votre plan
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
              Sans engagement, résiliable à tout moment en 1 clic.
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="relative p-8 bg-white rounded-3xl border-2 border-[var(--border)] hover:border-[var(--primary)]/40 hover:shadow-xl transition-all duration-300">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Starter</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Pour artisans qui veulent gagner du temps
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-[var(--text-primary)]">25€</span>
                  <span className="text-[var(--text-muted)] mb-2 font-medium">/mois</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 font-medium">
                  soit 0,83€/jour
                </p>
              </div>

              <Link
                href={starterHref}
                className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[var(--primary)] bg-[var(--primary-bg)] hover:bg-indigo-100 rounded-xl transition-colors duration-200 mb-8 cursor-pointer"
              >
                Choisir ce plan
                <ArrowRight className="w-4 h-4" />
              </Link>

              <ul className="space-y-3">
                {STARTER_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[var(--emerald)] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Shield className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                <span className="text-xs text-[var(--text-muted)]">
                  Signature simple &lt;1 500€ · Email certifié jusqu'à 5 000€
                </span>
              </div>
            </div>

            {/* Pro */}
            <div className="relative p-8 bg-gradient-to-br from-[var(--primary)] via-indigo-600 to-purple-700 rounded-3xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                <Star className="w-3 h-3 text-yellow-300" fill="currentColor" />
                <span className="text-xs font-bold text-white">Populaire</span>
              </div>

              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-1">Pro</h2>
                <p className="text-sm text-indigo-200">
                  Pour ceux qui veulent signer plus de clients
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-white">49€</span>
                  <span className="text-indigo-200 mb-2 font-medium">/mois</span>
                </div>
                <p className="text-xs text-indigo-300 mt-1.5 font-medium">
                  soit 1,63€/jour
                </p>
              </div>

              <Link
                href={proHref}
                className="group flex items-center justify-center gap-2 w-full py-3.5 text-sm font-semibold text-[var(--primary)] bg-white hover:bg-gray-50 rounded-xl transition-colors duration-200 mb-8 shadow-lg cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Choisir ce plan
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>

              <ul className="space-y-3">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-indigo-100">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-2 p-3 bg-white/10 rounded-xl">
                <Shield className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span className="text-xs text-indigo-200">
                  Signature certifiée eIDAS pour les devis &gt;5 000€
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2.5 p-3.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
                <span className="text-base flex-shrink-0">💰</span>
                <span className="text-xs font-semibold text-emerald-200">
                  +34% de devis signés en moyenne chez nos utilisateurs Pro
                </span>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] shadow-sm">
              <span>🔒</span>
              Paiement sécurisé par Stripe
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] shadow-sm">
              <span>💳</span>
              CB · Apple Pay · Google Pay
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] shadow-sm">
              <span>↩️</span>
              Résiliable à tout moment
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
