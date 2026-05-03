"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PartyPopper,
  User,
  FileText,
  Building2,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { TextField, SelectField } from "@/components/ui/Field";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;

const METIER_OPTIONS = [
  { value: "", label: "— Sélectionner —" },
  { value: "plombier", label: "Plombier" },
  { value: "electricien", label: "Électricien" },
  { value: "peintre", label: "Peintre" },
  { value: "carreleur", label: "Carreleur" },
  { value: "menuisier", label: "Menuisier" },
  { value: "macon", label: "Maçon" },
  { value: "freelance", label: "Freelance" },
  { value: "consultant", label: "Consultant" },
  { value: "photographe", label: "Photographe" },
  { value: "architecte", label: "Architecte" },
  { value: "commercant", label: "Commerçant" },
  { value: "artisan", label: "Artisan" },
  { value: "autre", label: "Autre" },
];

interface ClientStep {
  name: string;
  email: string;
  phone: string;
  skipped: boolean;
}

interface QuoteStep {
  title: string;
  amount: string;
  description: string;
  skipped: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [metier, setMetier] = useState("");
  const [siret, setSiret] = useState("");

  const [client, setClient] = useState<ClientStep>({
    name: "",
    email: "",
    phone: "",
    skipped: false,
  });

  const [quote, setQuote] = useState<QuoteStep>({
    title: "",
    amount: "",
    description: "",
    skipped: false,
  });

  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [createdQuoteId, setCreatedQuoteId] = useState<string | null>(null);

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function persistCompanyStep() {
    setSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        company: companyName.trim(),
        company_name: companyName.trim(),
        metier: metier || null,
        siret: siret.replace(/\s+/g, "") || null,
      });
      if (error) throw error;
      next();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSubmitting(false);
    }
  }

  async function persistClientStep(skip: boolean) {
    if (skip) {
      setClient((c) => ({ ...c, skipped: true }));
      next();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: client.name.trim(),
          email: client.email.trim(),
          phone: client.phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Création client impossible");
      setCreatedClientId(data.client?.id ?? null);
      next();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erreur création client");
    } finally {
      setSubmitting(false);
    }
  }

  async function persistQuoteStep(skip: boolean) {
    if (skip) {
      setQuote((q) => ({ ...q, skipped: true }));
      next();
      return;
    }
    if (!createdClientId) {
      // Pas de client → on ne peut pas créer le devis. On skip silencieusement.
      setQuote((q) => ({ ...q, skipped: true }));
      next();
      return;
    }
    setSubmitting(true);
    try {
      const amountTtc = Number(quote.amount.replace(",", "."));
      const taxRate = 20;
      const subtotal = amountTtc / (1 + taxRate / 100);
      const taxAmount = amountTtc - subtotal;
      const number = `QTL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
      const validUntil = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          taxRate,
          validUntil,
          notes: quote.description.trim() || undefined,
          clientId: createdClientId,
          items: [
            {
              id: "item-1",
              description: quote.title.trim() || "Prestation",
              quantity: 1,
              unitPrice: Number(subtotal.toFixed(2)),
              total: Number(subtotal.toFixed(2)),
            },
          ],
          subtotal: Number(subtotal.toFixed(2)),
          taxAmount: Number(taxAmount.toFixed(2)),
          total: amountTtc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Création devis impossible");
      setCreatedQuoteId(data.quote?.id ?? null);
      next();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erreur création devis");
    } finally {
      setSubmitting(false);
    }
  }

  async function finalize() {
    setSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await Promise.race([
          supabase.auth.updateUser({ data: { onboarded: true } }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
        ]).catch(() => {});

        void supabase.from("profiles").upsert({
          id: user.id,
          onboarded_at: new Date().toISOString(),
        });
      }
    } catch {
      // best-effort, on laisse le cookie + middleware faire le filet
    }

    document.cookie = "onboarded=1; path=/; max-age=31536000; SameSite=Lax";

    const p = new URLSearchParams(window.location.search).get("plan");
    if (p === "starter" || p === "pro") {
      window.location.href = `/paiement?plan=${p}`;
      return;
    }
    if (createdQuoteId) {
      router.push(`/dashboard/quotes/${createdQuoteId}`);
    } else {
      router.push("/dashboard?welcome=1");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFBFF] via-white to-[#FEF9F0] flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-50" />
      </div>

      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Logo variant="horizontal" size={30} id="onboarding" />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[600px] bg-white rounded-3xl border border-[var(--border)] shadow-xl p-6 sm:p-10">
          <Stepper step={step} />

          {step === 1 && (
            <StepCompany
              companyName={companyName}
              metier={metier}
              siret={siret}
              onCompany={setCompanyName}
              onMetier={setMetier}
              onSiret={setSiret}
              onNext={persistCompanyStep}
              loading={submitting}
            />
          )}

          {step === 2 && (
            <StepClient
              value={client}
              onChange={setClient}
              onNext={() => persistClientStep(false)}
              onSkip={() => persistClientStep(true)}
              onBack={back}
              loading={submitting}
            />
          )}

          {step === 3 && (
            <StepQuote
              value={quote}
              onChange={setQuote}
              hasClient={!!createdClientId || !client.skipped}
              onNext={() => persistQuoteStep(false)}
              onSkip={() => persistQuoteStep(true)}
              onBack={back}
              loading={submitting}
            />
          )}

          {step === 4 && (
            <StepDone
              companyName={companyName}
              clientCreated={!client.skipped && !!createdClientId}
              quoteCreated={!quote.skipped && !!createdQuoteId}
              onFinish={finalize}
              loading={submitting}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Configuration
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Étape {step} / {TOTAL_STEPS}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
    </div>
  );
}

function StepHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: typeof Building2;
}) {
  return (
    <div className="mb-6">
      <div className="w-11 h-11 rounded-2xl bg-[var(--primary-bg)] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">
        {title}
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function FooterButtons({
  onBack,
  onNext,
  onSkip,
  nextLabel = "Continuer",
  loading,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  loading?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] bg-white border border-[var(--border)] hover:bg-gray-50 rounded-xl cursor-pointer transition-colors disabled:opacity-60"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      )}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="inline-flex items-center justify-center px-3 py-3 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors disabled:opacity-60"
        >
          Passer cette étape
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={loading || nextDisabled}
        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {nextLabel}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

function StepCompany({
  companyName,
  metier,
  siret,
  onCompany,
  onMetier,
  onSiret,
  onNext,
  loading,
}: {
  companyName: string;
  metier: string;
  siret: string;
  onCompany: (v: string) => void;
  onMetier: (v: string) => void;
  onSiret: (v: string) => void;
  onNext: () => void;
  loading: boolean;
}) {
  const valid = companyName.trim().length > 0 && metier.length > 0;
  return (
    <div>
      <StepHeader
        icon={Building2}
        title="Bienvenue sur Quotely ! 👋"
        subtitle="Quelques infos pour personnaliser votre expérience."
      />
      <div className="flex flex-col gap-4">
        <TextField
          id="company-name"
          label="Nom de l'entreprise *"
          value={companyName}
          onChange={(e) => onCompany(e.target.value)}
          placeholder="Ex : TR Électricité"
          autoFocus
          required
        />
        <SelectField
          id="metier"
          label="Métier / Activité *"
          value={metier}
          onChange={(e) => onMetier(e.target.value)}
          options={METIER_OPTIONS}
          required
        />
        <TextField
          id="siret"
          label="SIRET"
          value={siret}
          onChange={(e) => onSiret(e.target.value)}
          placeholder="14 chiffres (optionnel)"
          inputMode="numeric"
          maxLength={17}
          hint="Vous pourrez l'ajouter plus tard."
        />
      </div>
      <FooterButtons onNext={onNext} loading={loading} nextDisabled={!valid} />
    </div>
  );
}

function StepClient({
  value,
  onChange,
  onNext,
  onSkip,
  onBack,
  loading,
}: {
  value: ClientStep;
  onChange: (v: ClientStep) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const valid = value.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim());
  return (
    <div>
      <StepHeader
        icon={User}
        title="Ajoutez votre premier client"
        subtitle="Pour créer votre premier devis, on a besoin d'un client."
      />
      <div className="flex flex-col gap-4">
        <TextField
          id="client-name"
          label="Nom du client *"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="M. Dupont"
          autoFocus
        />
        <TextField
          id="client-email"
          label="Email *"
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="client@exemple.fr"
          autoComplete="email"
        />
        <TextField
          id="client-phone"
          label="Téléphone"
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="06 12 34 56 78"
          autoComplete="tel"
          hint="Optionnel"
        />
      </div>
      <FooterButtons
        onBack={onBack}
        onSkip={onSkip}
        onNext={onNext}
        loading={loading}
        nextDisabled={!valid}
      />
    </div>
  );
}

function StepQuote({
  value,
  onChange,
  hasClient,
  onNext,
  onSkip,
  onBack,
  loading,
}: {
  value: QuoteStep;
  onChange: (v: QuoteStep) => void;
  hasClient: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const amountValid = !isNaN(Number(value.amount.replace(",", "."))) && Number(value.amount.replace(",", ".")) > 0;
  const valid = hasClient && value.title.trim().length > 0 && amountValid;
  return (
    <div>
      <StepHeader
        icon={FileText}
        title="Créez votre premier devis"
        subtitle="C'est l'occasion de tester en conditions réelles."
      />
      {!hasClient ? (
        <p className="text-sm text-[var(--text-muted)] bg-[var(--surface)] rounded-xl p-4 mb-4">
          Vous avez sauté l&apos;étape précédente — pas de souci, vous créerez votre premier devis depuis le
          dashboard.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <TextField
            id="quote-title"
            label="Titre / prestation *"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Ex : Pose carrelage salle de bain"
            autoFocus
          />
          <TextField
            id="quote-amount"
            label="Montant TTC (€) *"
            type="text"
            inputMode="decimal"
            value={value.amount}
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
            placeholder="1200"
          />
          <TextField
            id="quote-description"
            label="Description"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder="Détails complémentaires (optionnel)"
            hint="Vous pourrez modifier le devis ensuite."
          />
        </div>
      )}
      <FooterButtons
        onBack={onBack}
        onSkip={onSkip}
        onNext={onNext}
        loading={loading}
        nextLabel={hasClient ? "Continuer" : "Continuer"}
        nextDisabled={hasClient && !valid}
      />
    </div>
  );
}

function StepDone({
  companyName,
  clientCreated,
  quoteCreated,
  onFinish,
  loading,
}: {
  companyName: string;
  clientCreated: boolean;
  quoteCreated: boolean;
  onFinish: () => void;
  loading: boolean;
}) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center mb-5">
        <PartyPopper className="w-7 h-7 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">Tout est prêt ! 🎉</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Vous êtes en plan Pro pendant 14 jours. Toutes les fonctionnalités sont débloquées.
      </p>

      <ul className="text-left bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 sm:p-5 mb-6 flex flex-col gap-2.5">
        <RecapItem ok label={`Profil ${companyName ? `« ${companyName} »` : "entreprise"} complété`} />
        <RecapItem ok={clientCreated} label={clientCreated ? "Premier client ajouté" : "Premier client : à faire plus tard"} />
        <RecapItem ok={quoteCreated} label={quoteCreated ? "Premier devis créé" : "Premier devis : à faire plus tard"} />
      </ul>

      <button
        type="button"
        onClick={onFinish}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 rounded-xl cursor-pointer transition-colors shadow-sm"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Aller à mon dashboard
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

function RecapItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={cn(
          "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
          ok ? "bg-emerald-100 text-emerald-700" : "bg-[var(--border)] text-[var(--text-muted)]"
        )}
      >
        <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
      </span>
      <span className={ok ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-muted)]"}>
        {label}
      </span>
    </li>
  );
}
