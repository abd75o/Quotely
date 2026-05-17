"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, Check } from "lucide-react";
import { QuoviLogo } from "@/components/shared/QuoviLogo";

const COOLDOWN_SECONDS = 60;

function VerificationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const plan = searchParams.get("plan") ?? "";

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (!resent) return;
    const timeout = setTimeout(() => setResent(false), 3000);
    return () => clearTimeout(timeout);
  }, [resent]);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const callbackUrl = `${window.location.origin}/verify-email${plan ? `?plan=${plan}` : ""}`;
      const { error: sbError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (sbError) throw sbError;
      setResent(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de renvoyer l’email. Réessaie."
      );
    } finally {
      setResending(false);
    }
  }, [email, cooldown, resending, plan]);

  return (
    <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Link href="/" className="cursor-pointer">
          <QuoviLogo size={30} />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--primary-bg)] flex items-center justify-center">
              <Mail className="w-8 h-8 text-[var(--primary)]" strokeWidth={2} />
            </div>

            <h1 className="font-display text-[28px] font-medium text-[var(--text-primary)] tracking-tight mb-3">
              Vérifie ton email
            </h1>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-1">
              On t&apos;a envoyé un email à
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-5 break-all">
              {email || "ton adresse"}
            </p>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
              Clique sur le lien dans l&apos;email pour activer ton compte. Le
              lien expire dans 24 heures.
            </p>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending || !email}
              className="inline-flex items-center justify-center gap-2 w-full h-12 text-sm font-semibold rounded-full border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-bg)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {resending && <Loader2 className="w-4 h-4 animate-spin" />}
              {resent && !resending && (
                <Check className="w-4 h-4 text-emerald-500" />
              )}
              {resent
                ? "Email renvoyé"
                : cooldown > 0
                  ? `Renvoyer dans ${cooldown}s`
                  : resending
                    ? "Envoi en cours…"
                    : "Renvoyer l’email"}
            </button>

            {error && (
              <p className="text-xs text-red-600 mt-3">{error}</p>
            )}

            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Mauvaise adresse email ?{" "}
                <Link
                  href="/inscription"
                  className="text-[var(--primary)] font-semibold hover:underline"
                >
                  Recommencer l’inscription
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-5">
            Pense à vérifier ton dossier spam si tu ne reçois pas l&apos;email.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={null}>
      <VerificationContent />
    </Suspense>
  );
}
