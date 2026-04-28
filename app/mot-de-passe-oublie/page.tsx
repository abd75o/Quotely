"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Entrez votre adresse email."); return; }
    setLoading(true);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (sbError) throw sbError;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-50 to-blue-100 rounded-full blur-3xl opacity-40" />
      </div>

      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Link href="/" className="cursor-pointer">
          <Logo variant="horizontal" size={30} id="reset" />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">Email envoyé</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-1">Lien de réinitialisation envoyé à</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{email}</p>
                <p className="text-xs text-[var(--text-muted)] mt-3">
                  Vérifiez votre boîte mail et cliquez sur le lien pour choisir un nouveau mot de passe.
                </p>
                <Link
                  href="/connexion"
                  className="mt-5 inline-block text-sm text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <Link
                    href="/connexion"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors mb-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour
                  </Link>
                  <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                    Mot de passe oublié
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                    Entrez votre email, nous vous enverrons un lien de réinitialisation.
                  </p>
                </div>

                <form onSubmit={handleReset} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        placeholder="vous@example.fr"
                        autoComplete="email"
                        autoFocus
                        className="w-full h-12 pl-10 pr-4 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all"
                      />
                    </div>
                    {error && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-70 rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? "Envoi…" : "Envoyer le lien"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
