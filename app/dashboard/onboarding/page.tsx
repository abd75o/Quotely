"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  User as UserIcon,
  Wrench,
} from "lucide-react";
import { TextField, SelectField } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 3;

const LEGAL_STATUS = [
  { value: "", label: "Sélectionner…" },
  { value: "auto-entrepreneur", label: "Auto-entrepreneur" },
  { value: "ei", label: "EI (Entreprise Individuelle)" },
  { value: "sasu", label: "SASU" },
  { value: "sarl", label: "SARL" },
  { value: "eurl", label: "EURL" },
  { value: "sas", label: "SAS" },
  { value: "autre", label: "Autre" },
];

const METIERS = [
  { value: "", label: "Sélectionner…" },
  { value: "plombier", label: "Plombier" },
  { value: "electricien", label: "Électricien" },
  { value: "peintre", label: "Peintre" },
  { value: "macon", label: "Maçon" },
  { value: "carreleur", label: "Carreleur" },
  { value: "couvreur", label: "Couvreur" },
  { value: "menuisier", label: "Menuisier" },
  { value: "chauffagiste", label: "Chauffagiste" },
  { value: "multi-services", label: "Multi-services" },
  { value: "autre", label: "Autre" },
];

const SPECIALITES_BY_METIER: Record<string, string[]> = {
  plombier: ["Sanitaire", "Dépannage", "Rénovation", "Chauffage", "Climatisation"],
  electricien: ["Domotique", "Tableau électrique", "Mise aux normes", "Éclairage", "Borne IRVE"],
  peintre: ["Intérieur", "Extérieur", "Décoration", "Ravalement"],
  macon: ["Gros œuvre", "Carrelage", "Démolition", "Terrasse"],
  carreleur: ["Cuisine", "Salle de bain", "Extérieur", "Faïence"],
  couvreur: ["Toiture", "Zinguerie", "Isolation", "Démoussage"],
  menuisier: ["Pose", "Sur mesure", "Cuisine", "Dressing", "Bois exotique"],
  chauffagiste: ["Chaudière", "PAC", "Plancher chauffant", "Entretien"],
  "multi-services": ["Petit bricolage", "Jardinage", "Dépannage", "Aménagement"],
};

interface Identity {
  firstName: string;
  lastName: string;
  phone: string;
}

interface Company {
  companyName: string;
  siret: string;
  legalStatus: string;
  vatStatus: "franchise" | "soumis";
  address: string;
  postalCode: string;
  city: string;
}

interface Metier {
  metier: string;
  specialites: string[];
}

const EMPTY_IDENTITY: Identity = { firstName: "", lastName: "", phone: "" };
const EMPTY_COMPANY: Company = {
  companyName: "",
  siret: "",
  legalStatus: "",
  vatStatus: "franchise",
  address: "",
  postalCode: "",
  city: "",
};
const EMPTY_METIER: Metier = { metier: "", specialites: [] };

export default function OnboardingV4Page() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [company, setCompany] = useState<Company>(EMPTY_COMPANY);
  const [metier, setMetier] = useState<Metier>(EMPTY_METIER);

  // Prefill from existing profile so resuming an incomplete onboarding keeps data.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: p } = await supabase
        .from("profiles")
        .select(
          "first_name, last_name, telephone, company, company_name, siret, legal_status, vat_status, address, postal_code, city, metier, metier_principal, specialites",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !p) return;
      setIdentity({
        firstName: p.first_name ?? "",
        lastName: p.last_name ?? "",
        phone: p.telephone ?? "",
      });
      setCompany({
        companyName: p.company_name ?? p.company ?? "",
        siret: p.siret ?? "",
        legalStatus: p.legal_status ?? "",
        vatStatus:
          p.vat_status === "assujetti" || p.vat_status === "soumis"
            ? "soumis"
            : "franchise",
        address: p.address ?? "",
        postalCode: p.postal_code ?? "",
        city: p.city ?? "",
      });
      setMetier({
        metier: p.metier_principal ?? p.metier ?? "",
        specialites: Array.isArray(p.specialites) ? p.specialites : [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const identityValid = identity.firstName.trim() && identity.lastName.trim();
  const siretClean = company.siret.replace(/\s+/g, "");
  const companyValid = useMemo(() => {
    return (
      company.companyName.trim().length > 0 &&
      isValidSiret(siretClean) &&
      company.legalStatus.length > 0 &&
      company.address.trim().length > 0 &&
      /^\d{5}$/.test(company.postalCode.trim()) &&
      company.city.trim().length > 0
    );
  }, [company, siretClean]);
  const metierValid = metier.metier.length > 0;

  async function finalize() {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const payload = {
        id: user.id,
        first_name: identity.firstName.trim(),
        last_name: identity.lastName.trim(),
        telephone: identity.phone.trim() || null,
        company: company.companyName.trim(),
        company_name: company.companyName.trim(),
        siret: siretClean,
        legal_status: company.legalStatus,
        vat_status:
          company.vatStatus === "franchise" ? "auto_entrepreneur" : "assujetti",
        address: company.address.trim(),
        postal_code: company.postalCode.trim(),
        city: company.city.trim(),
        metier: metier.metier,
        metier_principal: metier.metier,
        specialites: metier.specialites,
        onboarding_completed: true,
        onboarded_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      // Propagate to JWT metadata so the middleware sees the change without
      // an extra DB roundtrip on the next request.
      await supabase.auth
        .updateUser({ data: { onboarded: true, onboarding_completed: true } })
        .catch(() => {});

      // Cookie path for the legacy middleware check (kept for safety).
      document.cookie = "onboarded=1; path=/; max-age=31536000; SameSite=Lax";

      toastSuccess(`Bienvenue ${identity.firstName} ! Ton compte est prêt.`);
      router.push("/dashboard");
    } catch (err) {
      console.error("[onboarding-v4] finalize failed:", err);
      toastError(humanizeError(err, "Impossible de finaliser l'onboarding."));
      setSubmitting(false);
    }
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col">
      <header className="border-b border-[var(--border)] bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Configuration · Étape {step} / {TOTAL_STEPS}
            </p>
            <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
              {Math.round(progress)}%
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-10">
          {step === 1 && (
            <StepIdentity
              value={identity}
              onChange={setIdentity}
              onNext={() => setStep(2)}
              canNext={!!identityValid}
            />
          )}
          {step === 2 && (
            <StepCompany
              value={company}
              onChange={setCompany}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              canNext={companyValid}
              siretClean={siretClean}
            />
          )}
          {step === 3 && (
            <StepMetier
              value={metier}
              onChange={setMetier}
              onBack={() => setStep(2)}
              onFinish={finalize}
              canFinish={metierValid}
              submitting={submitting}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function StepIdentity({
  value,
  onChange,
  onNext,
  canNext,
}: {
  value: Identity;
  onChange: (v: Identity) => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canNext) onNext();
      }}
    >
      <StepHeader
        icon={UserIcon}
        title="Qui es-tu ?"
        subtitle="Ces infos apparaîtront sur tes devis et factures."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <div className="mt-4">
        <TextField
          id="phone"
          label="Téléphone"
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="06 12 34 56 78"
          hint="Optionnel. Apparaît sur tes devis."
        />
      </div>
      <Footer onNext={onNext} canNext={canNext} nextType="submit" />
    </form>
  );
}

function StepCompany({
  value,
  onChange,
  onBack,
  onNext,
  canNext,
  siretClean,
}: {
  value: Company;
  onChange: (v: Company) => void;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  siretClean: string;
}) {
  const siretError =
    value.siret.length > 0 && !isValidSiret(siretClean)
      ? "Le SIRET doit faire 14 chiffres (vérifie la clé de Luhn)."
      : undefined;
  const postalError =
    value.postalCode.length > 0 && !/^\d{5}$/.test(value.postalCode)
      ? "5 chiffres."
      : undefined;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canNext) onNext();
      }}
    >
      <StepHeader
        icon={Building2}
        title="Ton entreprise"
        subtitle="Indispensable pour générer des devis conformes."
      />
      <div className="flex flex-col gap-4">
        <TextField
          id="company-name"
          label="Nom de l'entreprise *"
          value={value.companyName}
          onChange={(e) => onChange({ ...value, companyName: e.target.value })}
          placeholder="TR Électricité"
          autoFocus
          required
        />
        <TextField
          id="siret"
          label="SIRET *"
          value={value.siret}
          onChange={(e) => onChange({ ...value, siret: e.target.value })}
          placeholder="123 456 789 00012"
          inputMode="numeric"
          maxLength={17}
          error={siretError}
          hint={siretError ? undefined : "14 chiffres, contrôlé automatiquement."}
        />
        <SelectField
          id="legal-status"
          label="Forme juridique *"
          value={value.legalStatus}
          onChange={(e) => onChange({ ...value, legalStatus: e.target.value })}
          options={LEGAL_STATUS}
          required
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-[var(--text-primary)]">
            Statut TVA *
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <RadioCard
              checked={value.vatStatus === "franchise"}
              onChange={() => onChange({ ...value, vatStatus: "franchise" })}
              title="Franchise (auto-entrepreneur)"
              subtitle="TVA non applicable, art. 293 B du CGI"
            />
            <RadioCard
              checked={value.vatStatus === "soumis"}
              onChange={() => onChange({ ...value, vatStatus: "soumis" })}
              title="Soumis à TVA"
              subtitle="Tu factures 20% / 10% / 5,5% selon le chantier"
            />
          </div>
        </fieldset>
        <TextField
          id="address"
          label="Adresse *"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="12 rue de la République"
          autoComplete="street-address"
          required
        />
        <div className="grid grid-cols-3 gap-3">
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
            error={postalError}
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
      </div>
      <Footer
        onBack={onBack}
        onNext={onNext}
        canNext={canNext}
        nextType="submit"
      />
    </form>
  );
}

function StepMetier({
  value,
  onChange,
  onBack,
  onFinish,
  canFinish,
  submitting,
}: {
  value: Metier;
  onChange: (v: Metier) => void;
  onBack: () => void;
  onFinish: () => void;
  canFinish: boolean;
  submitting: boolean;
}) {
  const specialites = value.metier ? SPECIALITES_BY_METIER[value.metier] ?? [] : [];
  function toggleSpecialite(s: string) {
    const next = value.specialites.includes(s)
      ? value.specialites.filter((x) => x !== s)
      : [...value.specialites, s];
    onChange({ ...value, specialites: next });
  }
  return (
    <div>
      <StepHeader
        icon={Wrench}
        title="Ton métier"
        subtitle="Émile adaptera les mentions légales et les suggestions à ton activité."
      />
      <SelectField
        id="metier"
        label="Métier principal *"
        value={value.metier}
        onChange={(e) =>
          onChange({ metier: e.target.value, specialites: [] })
        }
        options={METIERS}
        required
      />
      {specialites.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            Spécialités{" "}
            <span className="text-[11px] font-normal text-[var(--text-muted)]">
              (optionnel — sélectionne celles qui te correspondent)
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {specialites.map((s) => {
              const active = value.specialites.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialite(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Footer
        onBack={onBack}
        onNext={onFinish}
        canNext={canFinish}
        nextLabel={submitting ? "Finalisation…" : "Terminer"}
        loading={submitting}
      />
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
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-bg)]">
        <Icon className="h-5 w-5 text-[var(--primary)]" />
      </div>
      <h2 className="font-fraunces text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function Footer({
  onBack,
  onNext,
  canNext,
  nextLabel = "Suivant",
  loading,
  nextType = "button",
}: {
  onBack?: () => void;
  onNext: () => void;
  canNext: boolean;
  nextLabel?: string;
  loading?: boolean;
  nextType?: "button" | "submit";
}) {
  return (
    <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </button>
      )}
      <button
        type={nextType}
        onClick={onNext}
        disabled={!canNext || loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {nextLabel}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  );
}

function RadioCard({
  checked,
  onChange,
  title,
  subtitle,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        checked
          ? "border-[var(--primary)] bg-[var(--primary-bg)]"
          : "border-[var(--border)] bg-white hover:bg-gray-50",
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
      />
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
          {title}
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
        {checked && (
          <CheckCircle2 className="mt-1 h-3.5 w-3.5 text-[var(--primary)]" />
        )}
      </div>
    </label>
  );
}

/**
 * SIRET validation: 14 digits + Luhn checksum.
 */
function isValidSiret(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(siret[i]);
    if (i % 2 === 0) {
      d = d * 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}
