"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setErrorMessage(searchParams.get("error_description") ?? errorParam);
      setStatus("error");
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("Lien de vérification manquant.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }
        setStatus("success");
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Erreur de vérification."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(
      () => router.push("/onboarding?welcome=true"),
      2000
    );
    return () => clearTimeout(t);
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Link href="/" className="cursor-pointer">
          <Logo variant="horizontal" size={30} id="verify-email" />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8 md:p-12 text-center">
            {status === "loading" && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--primary-bg)] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                </div>
                <h1 className="font-display text-[24px] font-medium text-[var(--text-primary)] tracking-tight">
                  Vérification en cours…
                </h1>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2
                    className="w-12 h-12 text-emerald-500"
                    strokeWidth={2}
                  />
                </div>
                <h1 className="font-display text-[28px] font-medium text-[var(--text-primary)] tracking-tight mb-3">
                  Email vérifié ✓
                </h1>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                  Bienvenue chez Quovi ! Redirection en cours…
                </p>
                <Loader2 className="w-5 h-5 mx-auto text-[var(--text-muted)] animate-spin" />
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle
                    className="w-12 h-12 text-red-500"
                    strokeWidth={2}
                  />
                </div>
                <h1 className="font-display text-[28px] font-medium text-[var(--text-primary)] tracking-tight mb-3">
                  Lien invalide ou expiré
                </h1>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
                  Le lien de vérification n’est plus valide. Demandez un
                  nouveau lien pour activer votre compte.
                </p>
                {errorMessage && (
                  <p className="text-xs text-[var(--text-muted)] mb-6">
                    {errorMessage}
                  </p>
                )}
                <Link
                  href="/inscription/verification"
                  className="inline-flex items-center justify-center w-full h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-full cursor-pointer transition-colors shadow-sm"
                >
                  Renvoyer un email de vérification
                </Link>
                <Link
                  href="/inscription"
                  className="block mt-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline"
                >
                  Recommencer l’inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
