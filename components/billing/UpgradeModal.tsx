"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { cn } from "@/lib/utils";
import { humanizeError } from "@/lib/errors";
import { toastError } from "@/lib/toast";

type PlanKey = "free" | "starter" | "pro";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** The user's current plan — disables that card's CTA. */
  currentPlan?: PlanKey;
  /** Optional intro line above the cards (e.g. "Tu as atteint la limite…"). */
  reason?: string;
}

interface PlanCardData {
  key: PlanKey;
  label: string;
  tagline: string;
  pricePerMonth: number;
  perDay?: string;
  popular?: boolean;
  highlights: string[];
  exclusions?: string[];
  footnote: string;
}

const PLANS: PlanCardData[] = [
  {
    key: "free",
    label: "Gratuit",
    tagline: "Pour vos premiers devis, en PDF",
    pricePerMonth: 0,
    highlights: [
      "Émile inclus (5 devis/mois)",
      "Devis au design pro (à votre image)",
      "TVA automatique",
      "Mentions légales automatiques",
      "Suivi simple des devis envoyés",
    ],
    exclusions: [
      "Signature en ligne",
      "Facture auto après signature",
      "Iris (assistant client)",
      "Tableau de bord avancé",
      "Support prioritaire",
    ],
    footnote: "Sans carte bancaire, sans engagement.",
  },
  {
    key: "starter",
    label: "Starter",
    tagline: "Pour démarrer et gérer votre activité",
    pricePerMonth: 25,
    perDay: "Soit moins de 0,85 € par jour",
    highlights: [
      "Tout le plan Gratuit inclus",
      "Émile inclus (30 devis/mois)",
      "Signature en ligne par email",
      "Suivi en temps réel",
      "Facture générée après signature",
      "Support par email sous 24h",
    ],
    exclusions: [
      "Iris (assistant client)",
      "Signature certifiée eIDAS",
      "Tableau de bord avancé",
      "Devis illimités",
      "Support prioritaire",
    ],
    footnote: "Signature en ligne incluse pour tous vos devis.",
  },
  {
    key: "pro",
    label: "Pro",
    tagline: "Signez plus de clients sans y passer vos soirées",
    pricePerMonth: 49,
    perDay: "Soit moins de 1,65 € par jour",
    popular: true,
    highlights: [
      "Tout le plan Starter inclus",
      "Émile + Iris : l'équipe complète",
      "Signature certifiée eIDAS pour les missions importantes",
      "Tableau de bord (revenus en temps réel)",
      "Jusqu'à 100 devis par mois",
      "Support prioritaire",
    ],
    footnote: "Signature certifiée eIDAS pour les missions importantes.",
  },
];

/**
 * Loaded once and cached at module level — Stripe.js explicitly recommends
 * NOT calling loadStripe inside a render. Returns null when the publishable
 * key isn't configured so the modal can show a friendly error instead of a
 * cryptic Stripe one.
 */
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> | null {
  if (stripePromise) return stripePromise;
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk) return null;
  stripePromise = loadStripe(pk);
  return stripePromise;
}

export function UpgradeModal({
  open,
  onClose,
  currentPlan = "free",
  reason,
}: UpgradeModalProps) {
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  // Reset checkout state every time the modal opens — otherwise reopening
  // shows a stale embedded form for the previous plan.
  useEffect(() => {
    if (open) {
      setCheckoutSecret(null);
      setLoadingPlan(null);
    }
  }, [open]);

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const stripe = useMemo(() => getStripePromise(), []);

  async function handleUpgrade(plan: "starter" | "pro") {
    if (loadingPlan) return;
    if (!stripe) {
      toastError(
        "Paiement indisponible : la clé publique Stripe n'est pas configurée.",
      );
      return;
    }
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        client_secret?: string;
        error?: string;
      };
      if (!res.ok || !data.client_secret) {
        toastError(
          humanizeError(
            data.error ?? new Error(`HTTP ${res.status}`),
            "Impossible de démarrer le paiement.",
          ),
        );
        return;
      }
      setCheckoutSecret(data.client_secret);
    } catch (err) {
      toastError(humanizeError(err, "Erreur réseau, réessaie."));
    } finally {
      setLoadingPlan(null);
    }
  }

  if (!open) return null;

  const showCheckout = checkoutSecret !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choisis ton plan"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="upgrade-modal-card relative flex max-h-[90vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-[var(--border)] bg-white px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <h2 className="font-fraunces text-xl font-extrabold text-[var(--text-primary)] sm:text-2xl">
              {showCheckout ? "Paiement sécurisé" : "Choisis ton plan"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)] sm:text-sm">
              {showCheckout
                ? "Tu peux fermer cette fenêtre à tout moment."
                : reason ?? "Passe au niveau supérieur en 30 secondes."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)] px-4 py-6 sm:px-6 sm:py-8">
          {showCheckout && stripe ? (
            <div className="mx-auto max-w-3xl">
              <EmbeddedCheckoutProvider
                stripe={stripe}
                options={{ clientSecret: checkoutSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : (
            <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  isCurrent={plan.key === currentPlan}
                  loading={loadingPlan === plan.key}
                  onChoose={() => {
                    if (plan.key === "free") return;
                    void handleUpgrade(plan.key);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-white px-6 py-3 sm:px-8">
          <p className="text-[11px] text-[var(--text-muted)] sm:text-xs">
            Annulable à tout moment. Facturation mensuelle.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
          >
            {showCheckout ? "Fermer" : "Annuler"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  loading,
  onChoose,
}: {
  plan: PlanCardData;
  isCurrent: boolean;
  loading: boolean;
  onChoose: () => void;
}) {
  const isFree = plan.key === "free";

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all",
        plan.popular
          ? "border-[var(--primary)] shadow-md ring-1 ring-[var(--primary)]/20"
          : "border-gray-200",
      )}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
          Le plus populaire
        </span>
      )}

      <header>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {plan.label}
        </span>
        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
          {plan.tagline}
        </p>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="font-fraunces text-4xl font-extrabold text-[var(--text-primary)] tabular-nums">
            {plan.pricePerMonth}
          </span>
          <span className="text-sm font-semibold text-[var(--text-muted)]">
            €/mois
          </span>
        </div>
        {plan.perDay && (
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {plan.perDay}
          </p>
        )}
      </header>

      <button
        type="button"
        onClick={isCurrent || isFree ? undefined : onChoose}
        disabled={isCurrent || isFree || loading}
        className={cn(
          "mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors",
          isCurrent
            ? "cursor-default bg-gray-100 text-[var(--text-muted)]"
            : isFree
              ? "cursor-default border border-gray-200 bg-white text-[var(--text-secondary)]"
              : plan.popular
                ? "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-dark)]"
                : "border border-[var(--primary)] bg-white text-[var(--primary)] hover:bg-[var(--primary-bg)]",
          "disabled:opacity-60",
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isCurrent ? (
          "Votre plan actuel"
        ) : isFree ? (
          "Rester en Gratuit"
        ) : (
          <>
            Passer à {plan.label}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <ul className="mt-6 flex flex-col gap-2.5">
        {plan.highlights.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 text-[13px] text-[var(--text-primary)]"
          >
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>{line}</span>
          </li>
        ))}
        {plan.exclusions?.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 text-[13px] text-[var(--text-muted)]"
          >
            <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300" />
            <span className="line-through decoration-gray-200">{line}</span>
          </li>
        ))}
      </ul>

      {plan.popular && (
        <p className="mt-5 text-center text-[12px] font-semibold italic text-[var(--primary)]">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Tout est inclus.
        </p>
      )}

      <p className="mt-auto pt-6 text-[11px] text-[var(--text-muted)]">
        {plan.footnote}
      </p>
    </article>
  );
}
