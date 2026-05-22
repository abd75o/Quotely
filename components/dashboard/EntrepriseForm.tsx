"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, PenLine, Save, Trash2, Upload } from "lucide-react";
import { TextField, SelectField, FieldShell } from "@/components/ui/Field";
import { SiretField } from "@/components/ui/SiretField";
import { SignatureModal } from "@/components/emile/SignatureModal";
import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";
import {
  formatSiret,
  isValidSiret,
  siretDigits,
  SIRET_ERROR_MSG,
} from "@/lib/format/siret";

const LOGO_BUCKET = "company-logos";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp";
const LOGO_EXT_FROM_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

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

const VAT_OPTIONS = [
  { value: "auto_entrepreneur", label: "Auto-entrepreneur (TVA non applicable)" },
  { value: "assujetti", label: "Assujetti à la TVA" },
  { value: "non_assujetti", label: "Non assujetti" },
];

interface CompanyForm {
  email: string; // read-only
  company: string;
  metier: string;
  siret: string;
  address: string;
  postal_code: string;
  city: string;
  telephone: string;
  vat_status: "auto_entrepreneur" | "assujetti" | "non_assujetti";
  vat_number: string;
  iban: string;
  bic: string;
  primary_color: string;
  /** Canonical accent — replaces primary_color/couleur_principale. PDF + email
   *  read this first. Validated /^#[0-9A-Fa-f]{6}$/ server-side and in DB. */
  brand_color: string;
  logo_url: string;
  // Assurances (migration 20260523_legal_insurance_and_registration).
  // Décennale = required for BTP trades (lib/quotes/send-helpers.ts gate);
  // RC pro = recommended for everyone, blocking for no one.
  decennale_company: string;
  decennale_number: string;
  decennale_zone: string;
  rc_pro_company: string;
  rc_pro_number: string;
  // Immatriculation : RCS pour sociétés (sarl/sas/sasu/eurl), RM pour
  // artisans/EI/auto-entrepreneur. Label adapté côté UI selon legal_status.
  // legal_status loaded read-only — l'édition se fait depuis l'onboarding,
  // ici on l'utilise juste pour choisir le bon label RCS vs RM.
  legal_status: string;
  registration_number: string;
  registration_city: string;
}

const BRAND_PRESETS: ReadonlyArray<{ label: string; hex: string }> = [
  { label: "Noir", hex: "#0F172A" },
  { label: "Bleu", hex: "#2563EB" },
  { label: "Indigo", hex: "#5B5BF6" },
  { label: "Vert", hex: "#059669" },
  { label: "Rouge", hex: "#DC2626" },
  { label: "Orange", hex: "#EA580C" },
];

const BRAND_HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * Pick the right label/placeholder/copy for the immatriculation field based
 * on the artisan's legal_status. Sociétés (sarl/sas/sasu/eurl) get a RCS
 * block with a city field; artisans (ei/auto-entrepreneur) get the RM
 * block alone. Anything else falls back to a generic "N° d'immatriculation"
 * with no city — preferable to a wrong label.
 */
const RCS_LEGAL_STATUSES = new Set(["sarl", "sas", "sasu", "eurl"]);
const RM_LEGAL_STATUSES = new Set(["ei", "auto-entrepreneur"]);

function getRegistrationConfig(legalStatus: string): {
  label: string;
  placeholder: string;
  hint: string;
  needsCity: boolean;
} {
  const s = legalStatus.toLowerCase().trim();
  if (RCS_LEGAL_STATUSES.has(s)) {
    return {
      label: "N° RCS",
      placeholder: "Ex : 853 271 064",
      hint: "Le numéro RCS (généralement le SIREN, 9 chiffres) + la ville du greffe ci-dessous apparaîtront en bas du PDF.",
      needsCity: true,
    };
  }
  if (RM_LEGAL_STATUSES.has(s)) {
    return {
      label: "N° RM (Répertoire des Métiers)",
      placeholder: "Ex : 853 271 064",
      hint: "Numéro d'immatriculation au Répertoire des Métiers de la chambre des métiers et de l'artisanat.",
      needsCity: false,
    };
  }
  return {
    label: "N° d'immatriculation",
    placeholder: "Ex : 853 271 064",
    hint: "Renseigne d'abord ta forme juridique (depuis l'onboarding) pour adapter le label RCS / RM.",
    needsCity: false,
  };
}

const EMPTY: CompanyForm = {
  email: "",
  company: "",
  metier: "",
  siret: "",
  address: "",
  postal_code: "",
  city: "",
  telephone: "",
  vat_status: "auto_entrepreneur",
  vat_number: "",
  iban: "",
  bic: "",
  primary_color: "#6366F1",
  brand_color: "#0F172A",
  logo_url: "",
  decennale_company: "",
  decennale_number: "",
  decennale_zone: "",
  rc_pro_company: "",
  rc_pro_number: "",
  legal_status: "",
  registration_number: "",
  registration_city: "",
};

export function EntrepriseForm() {
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [initial, setInitial] = useState<CompanyForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyForm, string>>>({});
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Signature artisan lives outside CompanyForm because /api/profile's strict
  // allowlist doesn't include signature_url — uploads go through the dedicated
  // /api/profile/signature endpoint (multipart-style PNG upload + Storage).
  // We keep it in local state to avoid a second fetch on every render.
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [deletingSignature, setDeletingSignature] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "company, metier, telephone, siret, address, postal_code, city, vat_status, vat_number, iban, bic, primary_color, brand_color, logo_url, signature_url, decennale_company, decennale_number, decennale_zone, rc_pro_company, rc_pro_number, legal_status, registration_number, registration_city"
        )
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      const next: CompanyForm = {
        email: user.email ?? "",
        company: profile?.company ?? "",
        metier: profile?.metier ?? "",
        // DB stores 14 raw digits — re-format for display so the input
        // shows "853 271 064 00018" on first load instead of a wall of
        // digits.
        siret: formatSiret(profile?.siret ?? ""),
        address: profile?.address ?? "",
        postal_code: profile?.postal_code ?? "",
        city: profile?.city ?? "",
        telephone: profile?.telephone ?? "",
        vat_status: (profile?.vat_status as CompanyForm["vat_status"]) ?? "auto_entrepreneur",
        vat_number: profile?.vat_number ?? "",
        iban: profile?.iban ?? "",
        bic: profile?.bic ?? "",
        primary_color: profile?.primary_color ?? "#6366F1",
        brand_color: (profile?.brand_color as string | null) ?? "#0F172A",
        logo_url: profile?.logo_url ?? "",
        decennale_company: profile?.decennale_company ?? "",
        decennale_number: profile?.decennale_number ?? "",
        decennale_zone: profile?.decennale_zone ?? "",
        rc_pro_company: profile?.rc_pro_company ?? "",
        rc_pro_number: profile?.rc_pro_number ?? "",
        legal_status: profile?.legal_status ?? "",
        registration_number: profile?.registration_number ?? "",
        registration_city: profile?.registration_city ?? "",
      };
      setForm(next);
      setInitial(next);
      setSignatureUrl(
        (profile?.signature_url as string | null | undefined) ?? null,
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial]
  );

  function update<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permettre de re-sélectionner le même fichier
    if (!file) return;
    if (!userId) {
      toastError("Session expirée — reconnectez-vous.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toastError("Logo trop lourd (2 Mo max).");
      return;
    }
    const ext = LOGO_EXT_FROM_TYPE[file.type];
    if (!ext) {
      toastError("Format non supporté (PNG, JPG, SVG ou WebP).");
      return;
    }
    setUploadingLogo(true);
    try {
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
      const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      // Cache-buster pour forcer le rafraîchissement après réécriture
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      update("logo_url", url);
      toastSuccess("Logo téléversé");
    } catch (err) {
      console.error("[EntrepriseForm] logo upload failed:", err);
      toastError(humanizeError(err, "Échec du téléversement"));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    if (!form.logo_url) return;
    update("logo_url", "");
  }

  async function handleSignatureDelete() {
    if (!signatureUrl) return;
    if (
      !confirm(
        "Supprimer ta signature ? Tu ne pourras plus envoyer de devis tant qu'une nouvelle signature n'est pas enregistrée.",
      )
    ) {
      return;
    }
    setDeletingSignature(true);
    try {
      const res = await fetch("/api/profile/signature", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body;
      }
      setSignatureUrl(null);
      toastSuccess("Signature supprimée.");
    } catch (err) {
      console.error("[EntrepriseForm] signature delete failed:", err);
      toastError(humanizeError(err, "Suppression échouée."));
    } finally {
      setDeletingSignature(false);
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CompanyForm, string>> = {};
    if (!form.company.trim()) errs.company = "Nom de l'entreprise requis.";
    if (form.siret && !isValidSiret(form.siret)) {
      errs.siret = SIRET_ERROR_MSG;
    }
    if (form.postal_code && !/^\d{5}$/.test(form.postal_code)) {
      errs.postal_code = "Code postal invalide (5 chiffres).";
    }
    if (form.vat_status === "assujetti" && !form.vat_number.trim()) {
      errs.vat_number = "Numéro de TVA requis pour les assujettis.";
    }
    if (form.brand_color && !BRAND_HEX_RE.test(form.brand_color)) {
      errs.brand_color = "Couleur invalide. Format attendu : #RRGGBB.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // Build payload from FORM STATE ONLY. We never spread `form` or any
      // other state into the body — that's how `plan` / `subscription_status`
      // / `trial_ends_at` would sneak in and trip the `profiles_plan_check`
      // CHECK constraint. Routing through /api/profile adds a second guard:
      // the server-side allowlist drops any non-whitelisted column even if a
      // future refactor accidentally widens this object.
      const payload: Record<string, string | null> = {
        company: form.company.trim() || null,
        company_name: form.company.trim() || null,
        metier: form.metier || null,
        telephone: form.telephone.trim() || null,
        siret: siretDigits(form.siret) || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
        vat_status: form.vat_status,
        vat_number:
          form.vat_status === "assujetti" ? form.vat_number.trim() || null : null,
        iban: form.iban.replace(/\s+/g, "") || null,
        bic: form.bic.replace(/\s+/g, "").toUpperCase() || null,
        primary_color: form.primary_color || "#6366F1",
        // Keep brand_color and primary_color in sync until the legacy column
        // can be retired. brand_color is the canonical read path going forward.
        brand_color: form.brand_color || "#0F172A",
        logo_url: form.logo_url || null,
        decennale_company: form.decennale_company.trim() || null,
        decennale_number: form.decennale_number.trim() || null,
        decennale_zone: form.decennale_zone.trim() || null,
        rc_pro_company: form.rc_pro_company.trim() || null,
        rc_pro_number: form.rc_pro_number.trim() || null,
        // RCS / RM — `registration_city` n'a de sens qu'avec un legal_status
        // société. On envoie quand même la valeur tapée (le PDF l'ignorera
        // si le statut est artisan), évite une logique cross-field au save.
        registration_number: form.registration_number.trim() || null,
        registration_city: form.registration_city.trim() || null,
      };

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
        throw body.error || body.fieldErrors ? body : new Error(`HTTP ${res.status}`);
      }

      setInitial(form);
      toastSuccess("Profil entreprise mis à jour");
    } catch (err) {
      console.error("[EntrepriseForm] save failed:", err);
      toastError(humanizeError(err, "Erreur lors de la sauvegarde"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      {/* Section 1 — Identité */}
      <Section title="Identité de l'entreprise">
        <FieldShell label="Logo" hint="Format conseillé : PNG transparent, 400×200px, fond transparent. PNG, JPG, SVG ou WebP · 2 Mo max. Apparaît sur vos devis et factures.">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] overflow-hidden">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logo_url}
                  alt="Logo de l'entreprise"
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-6 h-6" />
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept={LOGO_ACCEPT}
              onChange={handleLogoSelect}
              className="sr-only"
              aria-label="Téléverser un logo"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors"
            >
              {uploadingLogo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {form.logo_url ? "Remplacer" : "Téléverser un logo"}
            </button>
            {form.logo_url && !uploadingLogo && (
              <button
                type="button"
                onClick={handleLogoRemove}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Retirer
              </button>
            )}
          </div>
        </FieldShell>

        <TextField
          id="company"
          label="Nom de l'entreprise *"
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
          placeholder="Ex : TR Électricité, Sophie Martin Peinture…"
          error={errors.company}
          required
        />

        <SelectField
          id="metier"
          label="Métier / Activité"
          value={form.metier}
          onChange={(e) => update("metier", e.target.value)}
          options={METIER_OPTIONS}
        />

        <SiretField
          id="siret"
          label="SIRET"
          value={form.siret}
          onValueChange={(v) => update("siret", v)}
          error={errors.siret}
          hint="Optionnel — apparaît sur vos devis et factures"
        />
      </Section>

      {/* Section signature artisan */}
      <Section title="Ma signature">
        <FieldShell
          label="Signature de l'entreprise"
          hint="Apparaît dans le bloc « Bon pour accord » de chaque devis PDF. Obligatoire avant le premier envoi."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-24 w-48 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
              {signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureUrl}
                  alt="Signature de l'entreprise"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <PenLine className="h-6 w-6 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSignatureModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)]"
              >
                <PenLine className="h-4 w-4" />
                {signatureUrl ? "Modifier ma signature" : "Signer mon entreprise"}
              </button>
              {signatureUrl && (
                <button
                  type="button"
                  onClick={handleSignatureDelete}
                  disabled={deletingSignature}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingSignature ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </FieldShell>
      </Section>

      {/* Section 2 — Adresse */}
      <Section title="Adresse">
        <TextField
          id="address"
          label="Adresse"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="12 rue de la Paix"
          autoComplete="street-address"
        />
        <div className="grid grid-cols-3 gap-3">
          <TextField
            id="postal_code"
            label="Code postal"
            value={form.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
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
      </Section>

      {/* Section 3 — Contact */}
      <Section title="Contact">
        <TextField
          id="telephone"
          label="Téléphone"
          type="tel"
          value={form.telephone}
          onChange={(e) => update("telephone", e.target.value)}
          placeholder="+33 6 12 34 56 78"
          autoComplete="tel"
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          value={form.email}
          disabled
          hint="L'email est lié à votre compte. Pour le modifier, contactez le support."
        />
      </Section>

      {/* Section immatriculation — RCS pour les sociétés, RM pour les
          artisans/EI. Le label, le placeholder et la visibilité du champ
          "ville d'immatriculation" dérivent de form.legal_status (lui-même
          posé en onboarding). Si legal_status est vide, on tombe sur un
          label générique pour ne rien casser sur un profil partiel. */}
      <Section title="Immatriculation">
        {(() => {
          const registrationCfg = getRegistrationConfig(form.legal_status);
          return (
            <>
              <TextField
                id="registration_number"
                label={registrationCfg.label}
                value={form.registration_number}
                onChange={(e) =>
                  update("registration_number", e.target.value)
                }
                placeholder={registrationCfg.placeholder}
                hint={registrationCfg.hint}
              />
              {registrationCfg.needsCity && (
                <TextField
                  id="registration_city"
                  label="Ville d'immatriculation"
                  value={form.registration_city}
                  onChange={(e) =>
                    update("registration_city", e.target.value)
                  }
                  placeholder="Ex : Paris, Lyon, Marseille…"
                  hint="Ville du greffe où l'entreprise est inscrite."
                />
              )}
            </>
          );
        })()}
      </Section>

      {/* Section assurances — décennale obligatoire pour les métiers BTP
          (gate côté envoi : lib/quotes/send-helpers.ts). RC pro recommandée
          pour tous mais jamais bloquante. */}
      <Section title="Assurances">
        <FieldShell
          label="Garantie décennale"
          hint="Obligatoire pour les métiers du bâtiment (plomberie, électricité, peinture, maçonnerie, etc.). La mention apparaîtra sur tous tes devis PDF."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="decennale_company"
              label="Assureur"
              value={form.decennale_company}
              onChange={(e) => update("decennale_company", e.target.value)}
              placeholder="Ex : AXA, MAAF, SMA…"
            />
            <TextField
              id="decennale_number"
              label="N° de police"
              value={form.decennale_number}
              onChange={(e) => update("decennale_number", e.target.value)}
              placeholder="Ex : 1234567890"
            />
          </div>
          <TextField
            id="decennale_zone"
            label="Zone géographique couverte"
            value={form.decennale_zone}
            onChange={(e) => update("decennale_zone", e.target.value)}
            placeholder="Ex : France métropolitaine"
            hint="Précise la zone garantie par ton contrat (utile en cas de chantier hors région habituelle)."
          />
        </FieldShell>

        <FieldShell
          label="RC professionnelle (optionnel)"
          hint="Responsabilité civile professionnelle. Recommandée pour tous les artisans, particulièrement utile pour les chantiers chez le client."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="rc_pro_company"
              label="Assureur"
              value={form.rc_pro_company}
              onChange={(e) => update("rc_pro_company", e.target.value)}
              placeholder="Ex : Allianz, MMA…"
            />
            <TextField
              id="rc_pro_number"
              label="N° de police"
              value={form.rc_pro_number}
              onChange={(e) => update("rc_pro_number", e.target.value)}
              placeholder="Ex : 9876543210"
            />
          </div>
        </FieldShell>
      </Section>

      {/* Section 4 — Fiscalité */}
      <Section title="Fiscalité">
        <SelectField
          id="vat_status"
          label="Statut TVA"
          value={form.vat_status}
          onChange={(e) => update("vat_status", e.target.value as CompanyForm["vat_status"])}
          options={VAT_OPTIONS}
        />
        {form.vat_status === "assujetti" && (
          <TextField
            id="vat_number"
            label="Numéro TVA intracommunautaire"
            value={form.vat_number}
            onChange={(e) => update("vat_number", e.target.value)}
            placeholder="FR12345678901"
            error={errors.vat_number}
          />
        )}
      </Section>

      {/* Section 5 — Bancaires */}
      <Section title="Coordonnées bancaires">
        <TextField
          id="iban"
          label="IBAN"
          value={form.iban}
          onChange={(e) => update("iban", e.target.value)}
          placeholder="FR76 1234 5678 9012 3456 7890 123"
        />
        <TextField
          id="bic"
          label="BIC"
          value={form.bic}
          onChange={(e) => update("bic", e.target.value.toUpperCase())}
          placeholder="BNPAFRPP"
        />
      </Section>

      {/* Section 6 — Identité visuelle */}
      <Section title="Identité visuelle">
        <FieldShell
          label="Couleur d'accent"
          hint="Cette couleur sera utilisée sur vos devis PDF et la page de signature."
          error={errors.brand_color}
        >
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brand_color}
              onChange={(e) => {
                // Sync legacy primary_color so anything still reading it
                // keeps in step. brand_color stays canonical.
                update("brand_color", e.target.value);
                update("primary_color", e.target.value);
              }}
              aria-label="Choisir la couleur de marque"
              className="w-12 h-11 rounded-xl border border-[var(--border)] cursor-pointer"
            />
            <input
              type="text"
              value={form.brand_color}
              onChange={(e) => {
                const v = e.target.value;
                update("brand_color", v);
                if (BRAND_HEX_RE.test(v)) update("primary_color", v);
              }}
              spellCheck={false}
              className="h-11 px-3 text-sm font-mono bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 w-32 uppercase"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {BRAND_PRESETS.map((preset) => {
              const active =
                form.brand_color.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => {
                    update("brand_color", preset.hex);
                    update("primary_color", preset.hex);
                  }}
                  aria-label={`Couleur ${preset.label} ${preset.hex}`}
                  aria-pressed={active}
                  className={
                    "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer " +
                    (active
                      ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-white"
                      : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface)]")
                  }
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: preset.hex }}
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </FieldShell>

        <BrandColorPreview color={form.brand_color} />
      </Section>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-white/95 backdrop-blur border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          {dirty && (
            <p className="text-xs text-[var(--text-muted)] mr-auto">Modifications non enregistrées</p>
          )}
          <button
            type="submit"
            disabled={saving || !dirty}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Enregistrement…" : "Enregistrer mes informations"}
          </button>
        </div>
      </div>

      <SignatureModal
        open={signatureModalOpen}
        existingSignatureUrl={signatureUrl}
        onClose={() => setSignatureModalOpen(false)}
        onSaved={(url) => {
          setSignatureUrl(url);
          setSignatureModalOpen(false);
        }}
      />
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 mb-4">
      <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * Mini-PDF preview rendered side-by-side with the picker. Reproduces the
 * accent surfaces from the real PDF (grand total + status pill) so the
 * artisan judges contrast on the same backgrounds before saving. Width is
 * 200px tall ~80px per spec.
 */
function BrandColorPreview({ color }: { color: string }) {
  const valid = /^#[0-9A-Fa-f]{6}$/.test(color);
  const accent = valid ? color : "#0F172A";
  return (
    <div className="rounded-2xl border border-[var(--border)] p-3 bg-[var(--surface)] inline-flex">
      <div
        className="flex h-20 w-[260px] items-center justify-between rounded-xl border border-[var(--border-light)] bg-white px-4"
        aria-label="Aperçu de la couleur sur un devis"
      >
        <div>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "#94A3B8" }}
          >
            Total TTC
          </p>
          <p
            className="mt-0.5 text-xl font-extrabold tabular-nums"
            style={{ color: accent }}
          >
            8 998,00 €
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: accent }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
          Signé
        </span>
      </div>
    </div>
  );
}
