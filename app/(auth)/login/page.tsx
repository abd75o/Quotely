"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, Lock, Mail } from "lucide-react";
import { SocialButton } from "@/components/auth/SocialButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Entrez votre adresse email."); return; }
    if (!password) { setError("Entrez votre mot de passe."); return; }
    setLoading(true);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (sbError) throw sbError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", data.user.id)
        .single();

      router.push(profile?.onboarded_at ? "/dashboard/quotes" : "/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
        setError("Email ou mot de passe incorrect.");
      } else if (msg.toLowerCase().includes("confirm")) {
        setError("Confirmez votre email avant de vous connecter.");
      } else {
        setError(msg || "Erreur de connexion. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Bienvenue sur Quovi
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="text-[var(--primary)] font-semibold hover:underline cursor-pointer">
              S&apos;inscrire gratuitement
            </Link>
          </p>
        </div>

        <div className="space-y-4">
          <SocialButton provider="google" />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs font-medium text-[var(--text-muted)]">ou</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <form onSubmit={handleSignin} noValidate className="space-y-3">
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
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-[var(--text-primary)]">
                  Mot de passe
                </label>
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  className="w-full h-12 pl-10 pr-11 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-70 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-5">
        {["RGPD", "Données en France", "SSL"].map((item) => (
          <span key={item} className="text-[11px] font-medium text-[var(--text-muted)]">{item}</span>
        ))}
      </div>
    </div>
  );
}
