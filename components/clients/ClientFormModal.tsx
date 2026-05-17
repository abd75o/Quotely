"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { TextField } from "@/components/ui/Field";
import { LockedFeature } from "@/components/shared/LockedFeature";
import { toastError, toastSuccess } from "@/lib/toast";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { ClientRow, ClientType } from "@/lib/clients/queries";
import { cn } from "@/lib/utils";

const AVAILABLE_TAGS = ["Régulier", "VIP", "À relancer", "Premier contact", "Récurrent"];

interface ClientFormModalProps {
  open: boolean;
  initial?: ClientRow | null;
  onClose: () => void;
  onSaved: (client: ClientRow) => void;
}

interface FormState {
  type_client: ClientType;
  first_name: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  siret: string;
  notes: string;
  tags: string[];
}

const EMPTY: FormState = {
  type_client: "particulier",
  first_name: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  postal_code: "",
  city: "",
  siret: "",
  notes: "",
  tags: [],
};

function toFormState(c?: ClientRow | null): FormState {
  if (!c) return EMPTY;
  return {
    type_client: c.type_client ?? "particulier",
    first_name: c.first_name ?? "",
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    postal_code: c.postal_code ?? "",
    city: c.city ?? "",
    siret: c.siret ?? "",
    notes: c.notes ?? "",
    tags: c.tags ?? [],
  };
}

export function ClientFormModal({ open, initial, onClose, onSaved }: ClientFormModalProps) {
  const [form, setForm] = useState<FormState>(toFormState(initial));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(toFormState(initial));
      setErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  const isEdit = !!initial?.id;
  const title = isEdit ? "Modifier client" : "Nouveau client";
  const isPro = form.type_client === "professionnel";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = "Le nom est requis.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Adresse email invalide.";
    }
    if (form.postal_code && !/^\d{5}$/.test(form.postal_code)) {
      errs.postal_code = "Code postal invalide (5 chiffres).";
    }
    if (isPro && form.siret && !/^\d{14}$/.test(form.siret.replace(/\s+/g, ""))) {
      errs.siret = "SIRET invalide (14 chiffres).";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        first_name: form.first_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
        siret: isPro ? form.siret.replace(/\s+/g, "") || null : null,
        type_client: form.type_client,
        notes: form.notes.trim() || null,
        tags: form.tags,
      };

      const query = isEdit
        ? supabase.from("clients").update(payload).eq("id", initial!.id).select().single()
        : supabase.from("clients").insert(payload).select().single();

      const { data, error } = await query;
      if (error) throw error;
      toastSuccess(isEdit ? "Client mis à jour" : "Client ajouté");
      onSaved(data as unknown as ClientRow);
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(tag: string) {
    update(
      "tags",
      form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag]
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-modal-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-6"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h2 id="client-modal-title" className="text-lg font-extrabold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type */}
          <fieldset>
            <legend className="text-sm font-semibold text-[var(--text-primary)] mb-2">
              Type de client
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["particulier", "professionnel"] as const).map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer text-sm font-semibold transition-colors",
                    form.type_client === t
                      ? "bg-[var(--primary-bg)] border-[var(--primary)] text-[var(--primary)]"
                      : "bg-white border-[var(--border)] text-[var(--text-secondary)] hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="type_client"
                    value={t}
                    checked={form.type_client === t}
                    onChange={() => update("type_client", t)}
                    className="sr-only"
                  />
                  {t === "particulier" ? "Particulier" : "Professionnel"}
                </label>
              ))}
            </div>
          </fieldset>

          {form.type_client === "particulier" && (
            <TextField
              id="first_name"
              label="Prénom"
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              placeholder="Marc"
              autoComplete="given-name"
            />
          )}

          <TextField
            id="name"
            label={form.type_client === "particulier" ? "Nom *" : "Raison sociale *"}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder={form.type_client === "particulier" ? "Dupont" : "TR Électricité"}
            error={errors.name}
            required
            autoComplete={form.type_client === "particulier" ? "family-name" : "organization"}
          />

          <TextField
            id="email"
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="marc@example.fr"
            error={errors.email}
            required
            autoComplete="email"
          />

          <TextField
            id="phone"
            label="Téléphone"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
          />

          <TextField
            id="address"
            label="Adresse"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="12 rue de la République"
            autoComplete="street-address"
          />

          <div className="grid grid-cols-3 gap-3">
            <TextField
              id="postal_code"
              label="CP"
              value={form.postal_code}
              onChange={(e) =>
                update("postal_code", e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="75001"
              inputMode="numeric"
              maxLength={5}
              error={errors.postal_code}
              autoComplete="postal-code"
            />
            <TextField
              id="city"
              label="Ville"
              className="col-span-2"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Paris"
              autoComplete="address-level2"
            />
          </div>

          {form.type_client === "professionnel" && (
            <TextField
              id="siret"
              label="SIRET"
              value={form.siret}
              onChange={(e) => update("siret", e.target.value)}
              placeholder="14 chiffres"
              inputMode="numeric"
              maxLength={17}
              error={errors.siret}
            />
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-sm font-semibold text-[var(--text-primary)]">
              Notes
            </label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              placeholder="Informations utiles, préférences…"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-[var(--text-muted)] resize-none"
            />
          </div>

          {/* Tags — PRO only */}
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">Tags</p>
            <LockedFeature
              feature="canUseClientTags"
              requiredPlan="pro"
              variant="replace"
              teaser={{
                title: "Tags clients",
                description:
                  "Classez vos clients par tag (VIP, Régulier, À relancer…) pour mieux les gérer.",
              }}
            >
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => {
                  const active = form.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border",
                        active
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-gray-50"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </LockedFeature>
          </div>
        </form>

        <footer className="flex flex-col-reverse sm:flex-row gap-2 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] bg-white border border-[var(--border)] hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors shadow-sm"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
