"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { SelectField, TextField } from "@/components/ui/Field";
import { toastError, toastSuccess } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";

// Snake_case codes returned by checkProfileCompleteness. The modal only renders
// sections whose code appears in `missingFields` so the artisan sees the minimum
// surface required to unblock his quote.
export type ProfileField =
  | "first_name"
  | "last_name"
  | "telephone"
  | "company"
  | "siret"
  | "legal_status"
  | "vat_status"
  | "address"
  | "postal_code"
  | "city"
  | "iban"
  | "bic";

export interface ProfileUpdated {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  company_name?: string | null;
  siret?: string | null;
  telephone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  vat_status?: string | null;
  legal_status?: string | null;
  iban?: string | null;
  bic?: string | null;
  [key: string]: unknown;
}

interface ProfileCompletionModalProps {
  open: boolean;
  missingFields: ProfileField[];
  onClose: () => void;
  onCompleted: (profile: ProfileUpdated) => void;
  /** Optional initial values pre-filled from a previous fetch. */
  initial?: Partial<Record<ProfileField, string>>;
}

interface FormState {
  first_name: string;
  last_name: string;
  telephone: string;
  company: string;
  siret: string;
  legal_status: string;
  vat_status: string;
  address: string;
  postal_code: string;
  city: string;
  iban: string;
  bic: string;
}

const EMPTY: FormState = {
  first_name: "",
  last_name: "",
  telephone: "",
  company: "",
  siret: "",
  legal_status: "",
  vat_status: "",
  address: "",
  postal_code: "",
  city: "",
  iban: "",
  bic: "",
};

// Values MUST match the DB CHECK constraint on profiles.legal_status
// ('auto-entrepreneur','ei','eurl','sarl','sas','autre'). Any other value
// — including 'sasu' or the underscore form 'auto_entrepreneur' — would be
// rejected at write time.
const LEGAL_STATUS_OPTIONS = [
  { value: "", label: "— Sélectionner —" },
  { value: "auto-entrepreneur", label: "Auto-entrepreneur" },
  { value: "ei", label: "Entreprise Individuelle" },
  { value: "eurl", label: "EURL" },
  { value: "sarl", label: "SARL" },
  { value: "sas", label: "SAS" },
  { value: "autre", label: "Autre" },
];

const VAT_STATUS_OPTIONS = [
  { value: "", label: "— Sélectionner —" },
  { value: "auto_entrepreneur", label: "Auto-entrepreneur (franchise en base)" },
  { value: "assujetti", label: "Assujetti à la TVA" },
  { value: "non_assujetti", label: "Non assujetti" },
];

function isValidSiret(s: string): boolean {
  if (!s) return true;
  const digits = s.replace(/\s+/g, "");
  return /^\d{14}$/.test(digits);
}

function isValidPostal(s: string): boolean {
  if (!s) return true;
  return /^\d{5}$/.test(s);
}

function isValidIban(s: string): boolean {
  if (!s) return true;
  const compact = s.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact);
}

function isValidBic(s: string): boolean {
  if (!s) return true;
  const compact = s.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(compact);
}

export function ProfileCompletionModal({
  open,
  missingFields,
  onClose,
  onCompleted,
  initial,
}: ProfileCompletionModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // Snapshot of the missing field set so layout decisions stay stable while the
  // form is open. `Set` allows O(1) lookup in the JSX section guards.
  const missing = useMemo(() => new Set(missingFields), [missingFields]);

  // Reset form each time the modal opens. We pre-fill any value passed via
  // `initial` so the artisan doesn't re-type fields he already had.
  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY,
      ...Object.fromEntries(
        Object.entries(initial ?? {}).map(([k, v]) => [k, v ?? ""]),
      ),
    });
    setConfirmClose(false);
  }, [open, initial]);

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") attemptClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(EMPTY),
    [form],
  );

  // Validity = every REQUIRED missing field has a value AND every filled
  // optional field passes its format check.
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (form.siret && !isValidSiret(form.siret))
      e.siret = "SIRET invalide (14 chiffres).";
    if (form.postal_code && !isValidPostal(form.postal_code))
      e.postal_code = "Code postal invalide (5 chiffres).";
    if (form.iban && !isValidIban(form.iban)) e.iban = "IBAN invalide.";
    if (form.bic && !isValidBic(form.bic))
      e.bic = "BIC invalide (8 ou 11 caractères).";
    return e;
  }, [form]);

  const valid = useMemo(() => {
    if (Object.keys(errors).length > 0) return false;
    for (const field of missing) {
      // IBAN/BIC are optional even when "missing" (recommended-only).
      if (field === "iban" || field === "bic") continue;
      if (!form[field as keyof FormState]?.trim()) return false;
    }
    return true;
  }, [errors, form, missing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function attemptClose() {
    if (!dirty) {
      onClose();
      return;
    }
    setConfirmClose(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      // Build payload from CURRENT form state only — never spread other state
      // that could leak `plan` / `subscription_status` into the request body.
      const payload: Record<string, string | null> = {};
      const PUSH = (key: keyof FormState) => {
        const v = form[key].trim();
        if (v) payload[key] = v;
      };
      PUSH("first_name");
      PUSH("last_name");
      PUSH("telephone");
      PUSH("company");
      PUSH("siret");
      PUSH("legal_status");
      PUSH("vat_status");
      PUSH("address");
      PUSH("postal_code");
      PUSH("city");
      PUSH("iban");
      PUSH("bic");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          fieldErrors?: Record<string, string>;
        };
        throw body.error
          ? body
          : new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as { profile: ProfileUpdated };
      toastSuccess("Profil enregistré");
      onCompleted(json.profile);
      onClose();
    } catch (err) {
      console.error("[ProfileCompletionModal] save failed:", err);
      toastError(humanizeError(err, "Impossible d'enregistrer le profil."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const showIdentity =
    missing.has("first_name") ||
    missing.has("last_name") ||
    missing.has("telephone");
  const showCompany =
    missing.has("company") ||
    missing.has("siret") ||
    missing.has("legal_status") ||
    missing.has("vat_status");
  const showAddress =
    missing.has("address") ||
    missing.has("postal_code") ||
    missing.has("city");
  const showBank = missing.has("iban") || missing.has("bic");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compléter mon profil"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) attemptClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
          <div>
            <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">
              Compléter mon profil
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Quelques infos manquent pour que ton devis soit conforme et envoyé
              au client.
            </p>
          </div>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          {showIdentity && (
            <Section title="Identité">
              {(missing.has("first_name") || missing.has("last_name")) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {missing.has("first_name") && (
                    <TextField
                      id="profile-firstname"
                      label="Prénom *"
                      value={form.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                      placeholder="Sophie"
                      autoFocus
                      required
                    />
                  )}
                  {missing.has("last_name") && (
                    <TextField
                      id="profile-lastname"
                      label="Nom *"
                      value={form.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                      placeholder="Martin"
                      required
                    />
                  )}
                </div>
              )}
              {missing.has("telephone") && (
                <TextField
                  id="profile-phone"
                  label="Téléphone *"
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => update("telephone", e.target.value)}
                  placeholder="06 12 34 56 78"
                  required
                />
              )}
            </Section>
          )}

          {showCompany && (
            <Section title="Entreprise">
              {missing.has("company") && (
                <TextField
                  id="profile-company"
                  label="Nom de l'entreprise *"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Martin Peinture"
                  required
                />
              )}
              {missing.has("siret") && (
                <TextField
                  id="profile-siret"
                  label="SIRET *"
                  value={form.siret}
                  onChange={(e) => update("siret", e.target.value)}
                  placeholder="14 chiffres"
                  inputMode="numeric"
                  maxLength={17}
                  error={errors.siret}
                  required
                />
              )}
              {missing.has("legal_status") && (
                <SelectField
                  id="profile-legalstatus"
                  label="Forme juridique"
                  value={form.legal_status}
                  onChange={(e) => update("legal_status", e.target.value)}
                  options={LEGAL_STATUS_OPTIONS}
                />
              )}
              {missing.has("vat_status") && (
                <SelectField
                  id="profile-vatstatus"
                  label="Statut TVA *"
                  value={form.vat_status}
                  onChange={(e) => update("vat_status", e.target.value)}
                  options={VAT_STATUS_OPTIONS}
                  required
                />
              )}
            </Section>
          )}

          {showAddress && (
            <Section title="Adresse postale">
              {missing.has("address") && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="profile-address"
                    className="text-sm font-semibold text-[var(--text-primary)]"
                  >
                    Adresse *
                  </label>
                  <textarea
                    id="profile-address"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="12 rue de la Paix"
                    rows={2}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>
              )}
              {(missing.has("postal_code") || missing.has("city")) && (
                <div className="grid grid-cols-3 gap-3">
                  {missing.has("postal_code") && (
                    <TextField
                      id="profile-postal"
                      label="Code postal *"
                      value={form.postal_code}
                      onChange={(e) =>
                        update(
                          "postal_code",
                          e.target.value.replace(/\D/g, "").slice(0, 5),
                        )
                      }
                      placeholder="75001"
                      inputMode="numeric"
                      maxLength={5}
                      error={errors.postal_code}
                      required
                      className="col-span-1"
                    />
                  )}
                  {missing.has("city") && (
                    <TextField
                      id="profile-city"
                      label="Ville *"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Paris"
                      required
                      className={
                        missing.has("postal_code") ? "col-span-2" : "col-span-3"
                      }
                    />
                  )}
                </div>
              )}
            </Section>
          )}

          {showBank && (
            <Section title="Coordonnées bancaires">
              <p className="text-[12px] text-[var(--text-muted)]">
                Optionnel — pour afficher tes coordonnées bancaires sur les
                devis.
              </p>
              {missing.has("iban") && (
                <TextField
                  id="profile-iban"
                  label="IBAN"
                  value={form.iban}
                  onChange={(e) => update("iban", e.target.value)}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                  error={errors.iban}
                />
              )}
              {missing.has("bic") && (
                <TextField
                  id="profile-bic"
                  label="BIC"
                  value={form.bic}
                  onChange={(e) => update("bic", e.target.value.toUpperCase())}
                  placeholder="BNPAFRPP"
                  error={errors.bic}
                />
              )}
            </Section>
          )}
        </form>

        <footer className="flex items-center justify-end gap-3 border-t border-[var(--border)] bg-white px-6 py-3">
          <button
            type="button"
            onClick={attemptClose}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
          >
            Plus tard
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer mon profil
          </button>
        </footer>
      </div>

      {confirmClose && (
        <ConfirmDiscardDialog
          onCancel={() => setConfirmClose(false)}
          onConfirm={() => {
            setConfirmClose(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
        {title}
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function ConfirmDiscardDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Quitter sans enregistrer ?
        </h3>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Tu pourras compléter ton profil plus tard depuis les paramètres, mais
          le devis ne sera pas conforme tant que ces infos ne sont pas là.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-gray-50"
          >
            Continuer
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-red-700"
          >
            Quitter quand même
          </button>
        </div>
      </div>
    </div>
  );
}
