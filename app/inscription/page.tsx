"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Check,
  Info,
  Lock,
  Mail,
} from "lucide-react";
import { QuoviLogo } from "@/components/shared/QuoviLogo";
import { SocialButton } from "@/components/auth/SocialButton";

type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  barClass: string;
};

function getPasswordStrength(p: string): Strength {
  if (p.length === 0) return { score: 0, label: "", barClass: "bg-transparent" };
  const hasLetter = /[a-zA-Z]/.test(p);
  const hasDigit = /\d/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasSpecial = /[^a-zA-Z0-9]/.test(p);

  if (p.length < 8) {
    return { score: 1, label: "Mot de passe faible", barClass: "bg-red-500" };
  }
  if (!hasLetter || !hasDigit) {
    return { score: 2, label: "Mot de passe moyen", barClass: "bg-orange-500" };
  }
  if (p.length < 12 || (!hasUpper && !hasSpecial)) {
    return { score: 3, label: "Mot de passe bon", barClass: "bg-yellow-500" };
  }
  return { score: 4, label: "Mot de passe fort", barClass: "bg-emerald-500" };
}

export default function InscriptionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plan") ?? "";
    if (p === "starter" || p === "pro" || p === "free") {
      setPlan(p);
      if (p === "starter" || p === "pro") {
        try {
          window.localStorage.setItem("quovi_intended_plan", p);
        } catch {
          /* localStorage may be unavailable (private mode); silently ignore */
        }
      }
    }
  }, []);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid =
    password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const confirmMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    emailValid && passwordValid && passwordsMatch && cguAccepted && !loading;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      setError("Entre une adresse email valide.");
      return;
    }
    if (!passwordValid) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre."
      );
      return;
    }
    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!cguAccepted) {
      setError("Tu dois accepter les CGU pour continuer.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const callbackUrl = `${window.location.origin}/verify-email${plan ? `?plan=${plan}` : ""}`;
      const { data, error: sbError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: callbackUrl },
      });
      if (sbError) throw sbError;
      if (data.session) {
        router.push(plan ? `/dashboard/onboarding?plan=${plan}` : "/dashboard/onboarding");
      } else {
        router.push(
          `/inscription/verification?email=${encodeURIComponent(email.trim())}${plan ? `&plan=${plan}` : ""}`
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erreur d’inscription. Réessayez."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Link href="/" className="cursor-pointer">
          <QuoviLogo size={30} />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          {(plan === "starter" || plan === "pro") && (
            <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-[var(--primary-bg)] border border-[var(--primary)]/20 rounded-2xl">
              <Info className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--primary-dark)]">
                  Tu as sélectionné le plan{" "}
                  {plan === "starter" ? "Starter" : "Pro"}
                </p>
                <p className="text-xs text-[var(--primary-dark)]/80 mt-0.5 leading-snug">
                  Tu commences en plan Gratuit pour tester. Tu pourras basculer
                  vers {plan === "starter" ? "Starter" : "Pro"} depuis ton
                  tableau de bord.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Crée ton compte
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                Déjà inscrit ?{" "}
                <Link
                  href="/connexion"
                  className="text-[var(--primary)] font-semibold hover:underline cursor-pointer"
                >
                  Se connecter
                </Link>
              </p>
            </div>

            <div className="space-y-4">
              <SocialButton provider="google" />

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  ou
                </span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <form
                onSubmit={handleSignup}
                noValidate
                className="space-y-4"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
                  >
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="vous@example.fr"
                      autoComplete="email"
                      autoFocus
                      className="w-full h-12 pl-10 pr-4 text-base sm:text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
                  >
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="8 caractères minimum"
                      autoComplete="new-password"
                      className="w-full h-12 pl-10 pr-11 text-base sm:text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                      aria-label={showPassword ? "Masquer" : "Afficher"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((seg) => (
                          <div
                            key={seg}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              seg <= strength.score
                                ? strength.barClass
                                : "bg-[var(--border)]"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
                  >
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Saisis à nouveau"
                      autoComplete="new-password"
                      className={`w-full h-12 pl-10 pr-16 text-base sm:text-sm bg-white border rounded-xl outline-none focus:ring-2 placeholder:text-[var(--text-muted)] transition-all ${
                        confirmMismatch
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : passwordsMatch
                            ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                            : "border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/20"
                      }`}
                    />
                    {passwordsMatch && (
                      <Check className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                      aria-label={showConfirmPassword ? "Masquer" : "Afficher"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {confirmMismatch && (
                    <p className="text-[11px] text-red-600 mt-1.5">
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
                </div>

                {/* CGU checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cguAccepted}
                    onChange={(e) => setCguAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer accent-[var(--primary)]"
                  />
                  <span className="text-[13px] text-[var(--text-secondary)] leading-snug">
                    J’accepte les{" "}
                    <Link
                      href="/cgu"
                      className="text-[var(--primary)] hover:underline"
                    >
                      CGU
                    </Link>{" "}
                    et la{" "}
                    <Link
                      href="/politique-confidentialite"
                      className="text-[var(--primary)] hover:underline"
                    >
                      Politique de confidentialité
                    </Link>{" "}
                    de Quovi.
                  </span>
                </label>

                {error && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{" "}
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex items-center justify-center gap-2 w-full h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed rounded-full cursor-pointer transition-colors shadow-sm"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Création du compte…" : "Démarrer gratuitement"}
                </button>
              </form>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-5">
            {["RGPD", "Données en France", "SSL"].map((item) => (
              <span
                key={item}
                className="text-[11px] font-medium text-[var(--text-muted)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
