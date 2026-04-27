"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench, Zap, Paintbrush, Briefcase, ShoppingBag, MoreHorizontal,
  ArrowRight, Loader2, CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

// ─── Métiers ──────────────────────────────────────────────────────────────────

const METIERS = [
  { id: "plombier",      label: "Plombier",      icon: Wrench },
  { id: "electricien",   label: "Électricien",   icon: Zap },
  { id: "peintre",       label: "Peintre",        icon: Paintbrush },
  { id: "freelance",     label: "Freelance",      icon: Briefcase },
  { id: "commercant",    label: "Commerçant",     icon: ShoppingBag },
  { id: "autre",         label: "Autre",           icon: MoreHorizontal },
];

const TOTAL_STEPS = 3;

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-300",
            i < step ? "bg-[var(--primary)]" : "bg-[var(--border)]"
          )}
        />
      ))}
    </div>
  );
}

// ─── Step 1 — Métier ──────────────────────────────────────────────────────────

function StepMetier({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-1">
        Quel est votre métier ?
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Nous personnaliserons vos templates de devis.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {METIERS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              "flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 text-sm font-semibold cursor-pointer transition-all duration-150",
              value === m.id
                ? "border-[var(--primary)] bg-[var(--primary-bg)] text-[var(--primary)]"
                : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <m.icon className={cn("w-6 h-6", value === m.id ? "text-[var(--primary)]" : "text-[var(--text-muted)]")} />
            {m.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!value}
        className="flex items-center justify-center gap-2 w-full h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors shadow-sm"
      >
        Suivant
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Step 2 — Entreprise ──────────────────────────────────────────────────────

function StepCompany({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-1">
        Nom de votre entreprise
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Apparaîtra sur vos devis et factures.
      </p>

      <div className="mb-6">
        <label htmlFor="company" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
          Raison sociale ou nom commercial
        </label>
        <input
          id="company"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex : TR Électricité, Sophie Martin Peinture…"
          autoFocus
          className="w-full h-12 px-4 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-5 text-sm font-semibold text-[var(--text-secondary)] bg-white border border-[var(--border)] hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!value.trim()}
          className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors shadow-sm"
        >
          Suivant
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 — Téléphone ───────────────────────────────────────────────────────

function StepPhone({
  value,
  onChange,
  onSubmit,
  onBack,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-1">
        Votre numéro de téléphone
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Pour les notifications importantes (optionnel).
      </p>

      <div className="mb-6">
        <label htmlFor="phone" className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
          Téléphone professionnel
        </label>
        <input
          id="phone"
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="06 12 34 56 78"
          autoFocus
          autoComplete="tel"
          className="w-full h-12 px-4 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] transition-all"
        />
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          Vous pouvez ignorer cette étape et continuer.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-12 px-5 text-sm font-semibold text-[var(--text-secondary)] bg-white border border-[var(--border)] hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-70 rounded-xl cursor-pointer transition-colors shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {loading ? "Finalisation…" : "Commencer"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [metier, setMetier] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Mark onboarded in Auth metadata — middleware reads this from JWT, no DB query needed
      await Promise.race([
        supabase.auth.updateUser({ data: { onboarded: true } }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
      ]);

      // Save profile data in background — don't block redirect on this
      supabase.from("profiles").upsert({
        id: (await supabase.auth.getUser()).data.user?.id,
        metier,
        company,
        telephone: phone.trim() || null,
        onboarded_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});
    } catch {
      // proceed anyway
    }
    router.push("/dashboard/quotes?welcome=1");
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col">
      {/* Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-50" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
      </div>

      {/* Logo */}
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Logo variant="horizontal" size={30} id="onboarding" />
      </header>

      {/* Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px] bg-white rounded-3xl border border-[var(--border)] shadow-xl p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Configuration
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {step} / {TOTAL_STEPS}
            </p>
          </div>

          <ProgressBar step={step} />

          {step === 1 && (
            <StepMetier value={metier} onChange={setMetier} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <StepCompany
              value={company}
              onChange={setCompany}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepPhone
              value={phone}
              onChange={setPhone}
              onSubmit={handleFinish}
              onBack={() => setStep(2)}
              loading={loading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
