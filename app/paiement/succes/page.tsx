"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

function SuccesContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") === "starter" ? "Starter" : "Pro";
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (seconds <= 0) {
      window.location.href = "/dashboard/quotes";
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <>
      <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
        Bienvenue sur Quovi {plan} !
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
        Votre paiement a bien été reçu. Votre plan est en cours d'activation — cela prend quelques secondes.
      </p>
      <div className="flex items-center justify-center gap-2 mb-8 text-xs text-[var(--text-muted)]">
        <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
        Redirection automatique dans {seconds}s…
      </div>
    </>
  );
}

export default function PaiementSuccesPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-xl border border-[var(--border)]">
        <div className="mb-6">
          <Logo variant="horizontal" size={28} className="justify-center" />
        </div>

        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>

        <Suspense
          fallback={
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              Activation de votre plan en cours…
            </p>
          }
        >
          <SuccesContent />
        </Suspense>

        <Link
          href="/dashboard/quotes"
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-md"
        >
          Accéder à mon dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
