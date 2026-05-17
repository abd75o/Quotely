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

interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: CreatedClient) => void;
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

export function NewClientModal({ open, onClose, onCreated }: NewClientModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // Reset form when reopened
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setConfirmClose(false);
    }
  }, [open]);

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

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(EMPTY), [form]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const siretValid =
    form.type === "particulier" ||
    !form.siret ||
    /^\d{14}$/.test(form.siret.replace(/\s+/g, ""));
  const valid =
    form.name.trim().length > 0 &&
    emailValid &&
    (form.type === "professionnel" || form.firstName.trim().length > 0) &&
    siretValid;

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
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body;
      }
      const json = (await res.json()) as { client: CreatedClient };
      toastSuccess(`Client ${displayName(form)} créé.`);
      onCreated(json.client);
      onClose();
    } catch (err) {
      console.error("[NewClientModal] create failed:", err);
      toastError(humanizeError(err, "Impossible de créer le client."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nouveau client"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) attemptClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
          <div>
            <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">
              Nouveau client
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Ajoute un client à ton carnet d&apos;adresses.
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
              />
              <TypeRadio
                checked={form.type === "professionnel"}
                onChange={() => update("type", "professionnel")}
                icon={Building2}
                label="Professionnel"
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
                autoFocus
                required
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
              error={
                form.email.length > 0 && !emailValid
                  ? "Email invalide"
                  : undefined
              }
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
                label="SIRET"
                value={form.siret}
                onChange={(e) => update("siret", e.target.value)}
                placeholder="14 chiffres (optionnel)"
                inputMode="numeric"
                maxLength={17}
                error={
                  !siretValid && form.siret.length > 0
                    ? "SIRET invalide (14 chiffres attendus)"
                    : undefined
                }
              />
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="client-address"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Adresse
            </label>
            <textarea
              id="client-address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="12 rue de la République"
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <TextField
              id="client-postal"
              label="Code postal"
              value={form.postalCode}
              onChange={(e) =>
                update("postalCode", e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="75001"
              inputMode="numeric"
              maxLength={5}
              className="col-span-1"
            />
            <TextField
              id="client-city"
              label="Ville"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Paris"
              className="col-span-2"
            />
          </div>
        </form>

        <footer className="flex items-center justify-end gap-3 border-t border-[var(--border)] bg-white px-6 py-3">
          <button
            type="button"
            onClick={attemptClose}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer le client
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
}: {
  checked: boolean;
  onChange: () => void;
  icon: typeof Home;
  label: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
        checked
          ? "border-[var(--primary)] bg-[var(--primary-bg)]"
          : "border-[var(--border)] bg-white hover:bg-gray-50",
      )}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
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
