"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { SocialButton } from "@/components/auth/SocialButton";

export default function ConnexionPage() {
  const [mode, setMode] = useState<"social" | "email">("social");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Entrez votre adresse email."); return; }
    setLoading(true);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-50 to-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      {/* Logo */}
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Link href="/" className="cursor-pointer">
          <Logo variant="horizontal" size={30} id="connexion" />
        </Link>
      </header>

      {/* Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Connexion à Quotely
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                Pas encore de compte ?{" "}
                <Link href="/inscription" className="text-[var(--primary)] font-semibold hover:underline cursor-pointer">
                  S&apos;inscrire gratuitement
                </Link>
              </p>
            </div>

            {mode === "social" ? (
              <div className="space-y-3">
                <SocialButton provider="google" />
                <SocialButton provider="apple" />
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs font-medium text-[var(--text-muted)]">ou</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className="flex items-center justify-center gap-2.5 w-full h-12 px-5 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--surface)] hover:bg-gray-100 border border-[var(--border)] rounded-xl cursor-pointer transition-colors duration-150"
                >
                  <Mail className="w-4 h-4" />
                  Continuer avec un email
                </button>
              </div>
            ) : sent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">Vérifiez votre boîte mail</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-1">Lien de connexion envoyé à</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{email}</p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setMode("social"); setEmail(""); }}
                  className="mt-6 text-sm text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Utiliser une autre méthode
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
                <button
                  type="button"
                  onClick={() => setMode("social")}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5 mb-2 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  Retour
                </button>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="vous@example.fr"
                    autoComplete="email"
                    autoFocus
                    className="w-full h-12 px-4 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all"
                  />
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
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {loading ? "Envoi…" : "Recevoir le lien magique"}
                </button>
                <p className="text-xs text-center text-[var(--text-muted)]">
                  Pas de mot de passe requis.
                </p>
              </form>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 mt-5">
            {["RGPD", "Données en France", "SSL"].map((item) => (
              <span key={item} className="text-[11px] font-medium text-[var(--text-muted)]">{item}</span>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          <Link href="/legal/terms" className="text-[var(--primary)] hover:underline cursor-pointer">CGU</Link>
          {" · "}
          <Link href="/legal/privacy" className="text-[var(--primary)] hover:underline cursor-pointer">Confidentialité</Link>
        </p>
      </footer>
    </div>
  );
}
