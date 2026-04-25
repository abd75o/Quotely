"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { SocialButton } from "@/components/auth/SocialButton";

export default function LoginPage() {
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
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
    <div className="w-full max-w-[400px]">
      <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Bienvenue sur Quotely
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            14 jours Pro gratuits · Sans carte bancaire
          </p>
        </div>

        {mode === "social" ? (
          <div className="space-y-3">
            {/* Google */}
            <SocialButton provider="google" />

            {/* Apple */}
            <SocialButton provider="apple" />

            {/* Separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">ou</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Email link */}
            <button
              type="button"
              onClick={() => setMode("email")}
              className="flex items-center justify-center gap-2.5 w-full h-12 px-5 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--surface)] hover:bg-gray-100 border border-[var(--border)] rounded-xl cursor-pointer transition-colors duration-150"
            >
              <Mail className="w-4 h-4" />
              S&apos;inscrire avec un email
            </button>
          </div>
        ) : sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-2">Vérifiez votre boîte mail</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              Un lien de connexion a été envoyé à
            </p>
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
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-70 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? "Envoi du lien…" : "Recevoir le lien magique"}
            </button>

            <p className="text-xs text-center text-[var(--text-muted)]">
              Pas de mot de passe requis. Un lien sécurisé vous sera envoyé.
            </p>
          </form>
        )}
      </div>

      {/* Trust signals */}
      <div className="flex items-center justify-center gap-6 mt-5">
        {["RGPD", "Données en France", "SSL"].map((item) => (
          <span key={item} className="text-[11px] font-medium text-[var(--text-muted)]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
