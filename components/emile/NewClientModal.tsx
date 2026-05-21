"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Home, Loader2, X } from "lucide-react";
import { TextField } from "@/components/ui/Field";
import { toastError, toastSuccess } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export interface CreatedClient {
  id: string;
  name: string;
  first_name?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  type_client: "particulier" | "professionnel";
  siret?: string | null;
}

/**
 * When provided, the modal switches to EDIT mode:
 *  - Title becomes "Mettre à jour le client" + the existing values pre-fill.
 *  - Submit hits PUT /api/clients/[id] instead of POST /api/clients.
 *  - `onCreated` is still the success callback (it's effectively
 *    "onSaved"), reusing the same downstream wiring the chat already has.
 *
 * The `missingFields` array lets callers (e.g. Émile's sendQuote
 * client_incomplete flow) highlight precisely which legal-required
 * fields the artisan must complete before the devis can ship.
 */
export interface EditClientInitial extends Partial<CreatedClient> {
  id: string;
  name: string;
  email: string;
  type_client: "particulier" | "professionnel";
}

interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: CreatedClient) => void;
  initialData?: EditClientInitial | null;
  missingFields?: string[];
}

interface FormState {
  type: "particulier" | "professionnel";
  firstName: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  siret: string;
}

const EMPTY: FormState = {
  type: "particulier",
  firstName: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  siret: "",
};

function initialFromData(data: EditClientInitial | null | undefined): FormState {
  if (!data) return EMPTY;
  return {
    type: data.type_client,
    firstName: data.first_name ?? "",
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    address: data.address ?? "",
    postalCode: data.postal_code ?? "",
    city: data.city ?? "",
    siret: data.siret ?? "",
  };
}

interface FieldErrors {
  firstName?: string;
  name?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  siret?: string;
}

const POSTAL_RE = /^\d{5}$/;
const SIRET_RE = /^\d{14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FieldErrors {
  const errs: FieldErrors = {};

  if (form.type === "particulier" && !form.firstName.trim()) {
    errs.firstName = "Prénom requis.";
  }
  if (!form.name.trim()) {
    errs.name =
      form.type === "professionnel"
        ? "Raison sociale requise."
        : "Nom requis.";
  }
  if (!EMAIL_RE.test(form.email.trim())) {
    errs.email = "Email invalide.";
  }
  // Address / CP / Ville are legally required on a devis (devis nominatif
  // avec adresse du client). Block creation upstream so we never ship a
  // PDF with an incomplete recipient block.
  if (!form.address.trim()) {
    errs.address = "Adresse requise (devis légal).";
  }
  if (!POSTAL_RE.test(form.postalCode.trim())) {
    errs.postalCode = "Code postal requis (5 chiffres).";
  }
  if (!form.city.trim()) {
    errs.city = "Ville requise.";
  }
  if (form.type === "professionnel") {
    const siret = form.siret.replace(/\s+/g, "");
    if (siret && !SIRET_RE.test(siret)) {
      errs.siret = "SIRET invalide (14 chiffres attendus).";
    }
  }
  return errs;
}

export function NewClientModal({
  open,
  onClose,
  onCreated,
  initialData,
  missingFields,
}: NewClientModalProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<FormState>(initialFromData(initialData));
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // Show inline errors only after a first submit attempt — keeps the modal
  // from screaming red on every empty field while the artisan is still
  // typing.
  const [touched, setTouched] = useState(false);

  // Re-seed the form whenever the modal opens (or the initialData changes
  // while open — happens when the edit modal is reopened for a different
  // client right after the previous one closed).
  useEffect(() => {
    if (open) {
      setForm(initialFromData(initialData));
      setConfirmClose(false);
      setTouched(false);
    }
  }, [open, initialData]);

  // ESC handler
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") attemptClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  const dirty = useMemo(() => {
    const base = initialFromData(initialData);
    return JSON.stringify(form) !== JSON.stringify(base);
  }, [form, initialData]);

  const errors = useMemo(() => validate(form), [form]);
  const valid = Object.keys(errors).length === 0;

  // After a missing-field flow, the caller passes the snake_case codes the
  // tool refused. Map them to our form keys so we can highlight precisely
  // those fields even before the artisan touches anything.
  const forcedMissing = useMemo<FieldErrors>(() => {
    if (!missingFields || missingFields.length === 0) return {};
    const m: FieldErrors = {};
    for (const f of missingFields) {
      if (f === "address" && errors.address) m.address = errors.address;
      else if (f === "postal_code" && errors.postalCode) m.postalCode = errors.postalCode;
      else if (f === "city" && errors.city) m.city = errors.city;
      else if (f === "name" && errors.name) m.name = errors.name;
    }
    return m;
  }, [missingFields, errors]);

  function shownError(key: keyof FieldErrors): string | undefined {
    if (touched) return errors[key];
    return forcedMissing[key];
  }

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
    setTouched(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        first_name: form.firstName.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postalCode.trim() || null,
        city: form.city.trim() || null,
        type_client: form.type,
        siret:
          form.type === "professionnel"
            ? form.siret.replace(/\s+/g, "") || null
            : null,
      };
      const url = isEdit
        ? `/api/clients/${initialData!.id}`
        : "/api/clients";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body;
      }
      const json = (await res.json()) as { client: CreatedClient };
      toastSuccess(
        isEdit
          ? `Client ${displayName(form)} mis à jour.`
          : `Client ${displayName(form)} créé.`,
      );
      onCreated(json.client);
      onClose();
    } catch (err) {
      console.error(
        `[${isEdit ? "EditClientModal" : "NewClientModal"}] save failed:`,
        err,
      );
      toastError(
        humanizeError(
          err,
          isEdit
            ? "Impossible de mettre à jour le client."
            : "Impossible de créer le client.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Mettre à jour le client" : "Nouveau client"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) attemptClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
          <div>
            <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">
              {isEdit ? "Mettre à jour le client" : "Nouveau client"}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isEdit
                ? "Complète les infos manquantes pour rendre le devis légalement conforme."
                : "Ajoute un client à ton carnet d'adresses."}
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
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
        >
          {missingFields && missingFields.length > 0 && !touched && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              Champs à compléter avant l&apos;envoi du devis :{" "}
              <strong>{missingFields.join(", ")}</strong>.
            </div>
          )}

          <fieldset className="mb-5">
            <legend className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              Type de client
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <TypeRadio
                checked={form.type === "particulier"}
                onChange={() => update("type", "particulier")}
                icon={Home}
                label="Particulier"
                disabled={isEdit}
              />
              <TypeRadio
                checked={form.type === "professionnel"}
                onChange={() => update("type", "professionnel")}
                icon={Building2}
                label="Professionnel"
                disabled={isEdit}
              />
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {form.type === "particulier" && (
              <TextField
                id="client-firstname"
                label="Prénom *"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="Marie"
                autoFocus={!isEdit}
                required
                error={shownError("firstName")}
              />
            )}
            <TextField
              id="client-name"
              label={form.type === "particulier" ? "Nom *" : "Raison sociale *"}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={form.type === "particulier" ? "Dupont" : "ACME SAS"}
              required
              className={form.type === "professionnel" ? "sm:col-span-2" : undefined}
              error={shownError("name")}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="client-email"
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="marie@example.fr"
              error={shownError("email")}
              required
            />
            <TextField
              id="client-phone"
              label="Téléphone"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="06 12 34 56 78"
            />
          </div>

          {form.type === "professionnel" && (
            <div className="mt-4">
              <TextField
                id="client-siret"
                label="SIRET (recommandé)"
                value={form.siret}
                onChange={(e) => update("siret", e.target.value)}
                placeholder="14 chiffres"
                inputMode="numeric"
                maxLength={17}
                error={shownError("siret")}
              />
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="client-address"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Adresse *
            </label>
            <textarea
              id="client-address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="12 rue de la République"
              rows={2}
              className={cn(
                // text-base = 16px so iOS Safari does not auto-zoom on focus.
                "mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2.5 text-base outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 sm:text-sm",
                shownError("address")
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-[var(--border)]",
              )}
              required
            />
            {shownError("address") && (
              <p className="mt-1 text-xs text-red-600">{shownError("address")}</p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <TextField
              id="client-postal"
              label="Code postal *"
              value={form.postalCode}
              onChange={(e) =>
                update("postalCode", e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="75001"
              inputMode="numeric"
              maxLength={5}
              className="col-span-1"
              error={shownError("postalCode")}
              required
            />
            <TextField
              id="client-city"
              label="Ville *"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Paris"
              className="col-span-2"
              error={shownError("city")}
              required
            />
          </div>
        </form>

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[var(--border)] bg-white px-6 py-3">
          <button
            type="button"
            onClick={attemptClose}
            className="min-h-[44px] rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer les changements" : "Enregistrer le client"}
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

function TypeRadio({
  checked,
  onChange,
  icon: Icon,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  icon: typeof Home;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        checked
          ? "border-[var(--primary)] bg-[var(--primary-bg)]"
          : "border-[var(--border)] bg-white hover:bg-gray-50",
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          checked
            ? "bg-[var(--primary)] text-white"
            : "bg-[var(--surface)] text-[var(--text-muted)]",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span
        className={cn(
          "text-sm font-semibold",
          checked ? "text-[var(--primary)]" : "text-[var(--text-primary)]",
        )}
      >
        {label}
      </span>
    </label>
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
          Tu vas perdre les infos saisies pour ce client.
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

function displayName(f: FormState): string {
  if (f.type === "particulier") return `${f.firstName} ${f.name}`.trim();
  return f.name;
}
