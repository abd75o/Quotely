"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, X, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("trial-banner-dismissed") === "1") {
      setDismissed(true);
      return;
    }

    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from("profiles")
          .select("plan, trial_ends_at")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (!data || data.plan !== "trial") return;
            if (data.trial_ends_at) {
              const days = Math.max(
                0,
                Math.ceil(
                  (new Date(data.trial_ends_at).getTime() - Date.now()) / 86400_000
                )
              );
              setDaysLeft(days);
            } else {
              setDaysLeft(14);
            }
          });
      });
    });
  }, []);

  function dismiss() {
    sessionStorage.setItem("trial-banner-dismissed", "1");
    setDismissed(true);
  }

  // Trial expired — full-screen blocking overlay
  if (daysLeft === 0) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Votre essai est terminé
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            Choisissez un plan pour continuer à utiliser Quotely et ne pas perdre vos devis.
          </p>
          <Link
            href="/tarifs"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            Choisir un plan
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (dismissed || daysLeft === null) return null;

  const urgent = daysLeft <= 2;

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 px-5 py-3.5 rounded-2xl mb-6 overflow-hidden",
        urgent
          ? "bg-gradient-to-r from-amber-500 to-orange-500"
          : "bg-gradient-to-r from-[var(--primary)] to-indigo-600"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
          urgent ? "bg-white/20" : "bg-white/15"
        )}
      >
        {urgent
          ? <AlertTriangle className="w-4.5 h-4.5 text-white" />
          : <Sparkles className="w-4.5 h-4.5 text-white" />
        }
      </div>

      <p className="flex-1 text-sm font-semibold text-white min-w-0">
        {urgent
          ? `⚠️ Plus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""} ! Passez au Pro pour ne pas perdre vos devis.`
          : `Il vous reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""} d'essai gratuit.`}
      </p>

      <Link
        href="/tarifs"
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0 transition-colors cursor-pointer",
          urgent
            ? "bg-white text-amber-600 hover:bg-amber-50"
            : "bg-white text-[var(--primary)] hover:bg-indigo-50"
        )}
      >
        Passer au Pro
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/15 cursor-pointer transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
