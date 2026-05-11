"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PartyPopper,
  User as UserIcon,
  Building2,
  Upload,
  Trash2,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { TextField, SelectField } from "@/components/ui/Field";
import { WelcomePopup } from "@/components/onboarding/WelcomePopup";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 3;
const LOGO_BUCKET = "company-logos";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
const LOGO_EXT_FROM_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const LEGAL_STATUS_OPTIONS = [
  { value: "auto-entrepreneur", label: "Auto-entrepreneur (micro-entreprise)" },
  { value: "ei", label: "EI (Entreprise Individuelle)" },
  { value: "eurl", label: "EURL" },
  { value: "sarl", label: "SARL" },
  { value: "sas", label: "SAS / SASU" },
  { value: "autre", label: "Autre" },
];

const METIER_OPTIONS = [
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

interface IdentityStep {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  logoUrl: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [legalStatus, setLegalStatus] = useState("");
  const [metier, setMetier] = useState("autre");
  const [siret, setSiret] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [identity, setIdentity] = useState<IdentityStep>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
    logoUrl: "",
  });

  // Prefill email with the signed-in user's address.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);
      setIdentity((prev) =>
        prev.email ? prev : { ...prev, email: user.email ?? "" }
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function persistCompanyStep() {
    setErrorMsg(null);
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
        legal_status: legalStatus || null,
        metier: metier || null,
        siret: siret.replace(/\s+/g, "") || null,
      });
      if (error) throw error;
      next();
    } catch (err) {
      console.error("[onboarding] persistCompanyStep error:", err);
      setErrorMsg("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function persistIdentityStep() {
    setErrorMsg(null);
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
        first_name: identity.firstName.trim() || null,
        last_name: identity.lastName.trim() || null,
        telephone: identity.phone.trim() || null,
        address: identity.address.trim() || null,
        postal_code: identity.postalCode.trim() || null,
        city: identity.city.trim() || null,
        logo_url: identity.logoUrl || null,
      });
      if (error) throw error;

      // If user changed the email, propagate to auth (silent best-effort).
      if (identity.email && identity.email !== user.email) {
        await supabase.auth
          .updateUser({ email: identity.email.trim() })
          .catch(() => {});
      }
      next();
    } catch (err) {
      console.error("[onboarding] persistIdentityStep error:", err);
      setErrorMsg("error");
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
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 2000)
          ),
        ]).catch(() => {});

        void supabase.from("profiles").upsert({
          id: user.id,
          onboarded_at: new Date().toISOString(),
        });
      }
    } catch {
      // best-effort
    }

    document.cookie = "onboarded=1; path=/; max-age=31536000; SameSite=Lax";

    const p = new URLSearchParams(window.location.search).get("plan");
    if (p === "starter" || p === "pro") {
      window.location.href = `/paiement?plan=${p}`;
      return;
    }
    router.push("/dashboard?welcome=1");
  }

  return (
    <div className="min-h-screen bg-[#FBFAF7] flex flex-col">
      <Suspense fallback={null}>
        <WelcomePopup />
      </Suspense>
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Logo variant="horizontal" size={30} id="onboarding" />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[600px] bg-white rounded-3xl border border-[var(--border)] shadow-xl p-6 sm:p-10">
          <Stepper step={step} />

          {step === 1 && (
            <StepCompany
              companyName={companyName}
              legalStatus={legalStatus}
              metier={metier}
              siret={siret}
              onCompany={setCompanyName}
              onLegalStatus={setLegalStatus}
              onMetier={setMetier}
              onSiret={setSiret}
              onNext={persistCompanyStep}
              loading={submitting}
              errorMsg={errorMsg}
            />
          )}

          {step === 2 && (
            <StepIdentity
              value={identity}
              userId={userId}
              onChange={setIdentity}
              onBack={back}
              onNext={persistIdentityStep}
              loading={submitting}
              errorMsg={errorMsg}
            />
          )}

          {step === 3 && (
            <StepDone
              companyName={companyName}
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
  nextLabel = "Continuer",
  loading,
  nextDisabled,
  nextType = "button",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  loading?: boolean;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
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
      <button
        type={nextType}
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
  legalStatus,
  metier,
  siret,
  onCompany,
  onLegalStatus,
  onMetier,
  onSiret,
  onNext,
  loading,
  errorMsg,
}: {
  companyName: string;
  legalStatus: string;
  metier: string;
  siret: string;
  onCompany: (v: string) => void;
  onLegalStatus: (v: string) => void;
  onMetier: (v: string) => void;
  onSiret: (v: string) => void;
  onNext: () => void;
  loading: boolean;
  errorMsg: string | null;
}) {
  const valid =
    companyName.trim().length > 0 &&
    legalStatus.length > 0 &&
    metier.length > 0;
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <StepHeader
        icon={Building2}
        title="Votre entreprise"
        subtitle="Configurons votre profil pour créer vos premiers devis."
      />
      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4 text-sm">
          <strong>⚠️ Une erreur est survenue.</strong> Réessayez dans quelques
          instants ou contactez le support.
        </div>
      )}
      <div className="flex flex-col gap-4">
        <TextField
          id="company-name"
          label="Nom de l’entreprise *"
          value={companyName}
          onChange={(e) => onCompany(e.target.value)}
          placeholder="Ex : TR Électricité"
          autoFocus
          required
        />
        <SelectField
          id="legal-status"
          label="Statut juridique *"
          value={legalStatus}
          onChange={(e) => onLegalStatus(e.target.value)}
          options={[
            { value: "", label: "Sélectionner…" },
            ...LEGAL_STATUS_OPTIONS,
          ]}
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
          hint="Vous pourrez l’ajouter plus tard."
        />
      </div>
      {!valid && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Renseignez le nom, le statut juridique et le métier pour continuer
        </p>
      )}
      <FooterButtons
        onNext={onNext}
        loading={loading}
        nextDisabled={!valid}
        nextType="submit"
      />
    </form>
  );
}

function StepIdentity({
  value,
  userId,
  onChange,
  onNext,
  onBack,
  loading,
  errorMsg,
}: {
  value: IdentityStep;
  userId: string | null;
  onChange: (v: IdentityStep) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
  errorMsg: string | null;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim());
  const postalValid = /^\d{5}$/.test(value.postalCode.trim());
  const valid =
    value.firstName.trim().length > 0 &&
    value.lastName.trim().length > 0 &&
    emailValid &&
    value.phone.trim().length > 0 &&
    value.address.trim().length > 0 &&
    postalValid &&
    value.city.trim().length > 0;

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!userId) {
      toastError("Session non disponible — réessayez.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toastError("Logo trop volumineux (max 2 Mo).");
      return;
    }
    const ext = LOGO_EXT_FROM_TYPE[file.type];
    if (!ext) {
      toastError("Format non supporté (PNG, JPG ou WebP).");
      return;
    }
    setUploadingLogo(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const path = `${userId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "0",
        });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(path);
      onChange({ ...value, logoUrl: `${pub.publicUrl}?v=${Date.now()}` });
      toastSuccess("Logo téléversé");
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "Échec du téléversement"
      );
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function removeLogo() {
    onChange({ ...value, logoUrl: "" });
  }

  return (
    <div>
      <StepHeader
        icon={UserIcon}
        title="Vos informations"
        subtitle="Ces infos apparaîtront sur vos devis et factures."
      />
      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded mb-4 text-sm">
          <strong>⚠️ Une erreur est survenue.</strong> Réessayez dans quelques
          instants.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          id="first-name"
          label="Prénom *"
          value={value.firstName}
          onChange={(e) => onChange({ ...value, firstName: e.target.value })}
          placeholder="Pierre"
          autoFocus
          required
        />
        <TextField
          id="last-name"
          label="Nom *"
          value={value.lastName}
          onChange={(e) => onChange({ ...value, lastName: e.target.value })}
          placeholder="Martin"
          required
        />
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <TextField
          id="email"
          label="Email professionnel *"
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="vous@example.fr"
          autoComplete="email"
          required
        />
        <TextField
          id="phone"
          label="Téléphone *"
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="06 12 34 56 78"
          autoComplete="tel"
          required
        />
        <TextField
          id="address"
          label="Adresse *"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="12 rue de la République"
          autoComplete="street-address"
          required
        />
        <div className="grid grid-cols-3 gap-4">
          <TextField
            id="postal-code"
            label="Code postal *"
            value={value.postalCode}
            onChange={(e) =>
              onChange({
                ...value,
                postalCode: e.target.value.replace(/\D/g, "").slice(0, 5),
              })
            }
            placeholder="75001"
            inputMode="numeric"
            maxLength={5}
            required
            className="col-span-1"
          />
          <TextField
            id="city"
            label="Ville *"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Paris"
            autoComplete="address-level2"
            required
            className="col-span-2"
          />
        </div>

        {/* Logo */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Logo
          </span>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {value.logoUrl ? (
                <Image
                  src={value.logoUrl}
                  alt="Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Upload className="w-5 h-5 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <input
                ref={logoInputRef}
                type="file"
                accept={LOGO_ACCEPT}
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <div className="flex gap-2">
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {value.logoUrl ? "Remplacer" : "Téléverser"}
                </label>
                {value.logoUrl && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Retirer
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Recommandé pour personnaliser vos devis. PNG, JPG ou WebP, max 2 Mo.
          </p>
        </div>
      </div>
      <FooterButtons
        onBack={onBack}
        onNext={onNext}
        loading={loading}
        nextDisabled={!valid}
      />
    </div>
  );
}

function StepDone({
  companyName,
  onFinish,
  loading,
}: {
  companyName: string;
  onFinish: () => void;
  loading: boolean;
}) {
  const displayName = companyName.trim() || "votre entreprise";
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <PartyPopper className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
        Tout est prêt ! 🎉
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Votre profil « {displayName} » est configuré. Vous pouvez maintenant
        créer votre premier devis.
      </p>

      <ul className="text-left bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 sm:p-5 mb-5 flex flex-col gap-2.5">
        <RecapItem ok label={`Profil « ${displayName} » complété`} />
        <RecapItem ok label="Informations personnelles renseignées" />
        <RecapItem ok={false} label="Premier devis : à créer dans votre dashboard" />
      </ul>

      <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
        Vous êtes sur le plan Gratuit (5 devis/mois). Passez à Starter ou Pro
        à tout moment depuis votre tableau de bord.
      </p>

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
          ok
            ? "bg-emerald-100 text-emerald-700"
            : "bg-[var(--border)] text-[var(--text-muted)]"
        )}
      >
        <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
      </span>
      <span
        className={
          ok
            ? "text-[var(--text-primary)] font-semibold"
            : "text-[var(--text-muted)]"
        }
      >
        {label}
      </span>
    </li>
  );
}
