"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { TextField, SelectField, FieldShell } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";

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
  logo_url: string;
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
  logo_url: "",
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
          "company, metier, telephone, siret, address, postal_code, city, vat_status, vat_number, iban, bic, primary_color, logo_url"
        )
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      const next: CompanyForm = {
        email: user.email ?? "",
        company: profile?.company ?? "",
        metier: profile?.metier ?? "",
        siret: profile?.siret ?? "",
        address: profile?.address ?? "",
        postal_code: profile?.postal_code ?? "",
        city: profile?.city ?? "",
        telephone: profile?.telephone ?? "",
        vat_status: (profile?.vat_status as CompanyForm["vat_status"]) ?? "auto_entrepreneur",
        vat_number: profile?.vat_number ?? "",
        iban: profile?.iban ?? "",
        bic: profile?.bic ?? "",
        primary_color: profile?.primary_color ?? "#6366F1",
        logo_url: profile?.logo_url ?? "",
      };
      setForm(next);
      setInitial(next);
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
      toastError(err instanceof Error ? err.message : "Échec du téléversement");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    if (!form.logo_url) return;
    update("logo_url", "");
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CompanyForm, string>> = {};
    if (!form.company.trim()) errs.company = "Nom de l'entreprise requis.";
    if (form.siret && !/^\d{14}$/.test(form.siret.replace(/\s+/g, ""))) {
      errs.siret = "Le SIRET doit contenir 14 chiffres.";
    }
    if (form.postal_code && !/^\d{5}$/.test(form.postal_code)) {
      errs.postal_code = "Code postal invalide (5 chiffres).";
    }
    if (form.vat_status === "assujetti" && !form.vat_number.trim()) {
      errs.vat_number = "Numéro de TVA requis pour les assujettis.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const payload = {
        id: user.id,
        company: form.company.trim(),
        company_name: form.company.trim(),
        metier: form.metier || null,
        telephone: form.telephone.trim() || null,
        siret: form.siret.replace(/\s+/g, "") || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
        vat_status: form.vat_status,
        vat_number: form.vat_status === "assujetti" ? form.vat_number.trim() : null,
        iban: form.iban.replace(/\s+/g, "") || null,
        bic: form.bic.replace(/\s+/g, "").toUpperCase() || null,
        primary_color: form.primary_color || "#6366F1",
        logo_url: form.logo_url || null,
      };

      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      setInitial(form);
      toastSuccess("Profil entreprise mis à jour");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
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
        <FieldShell label="Logo" hint="PNG, JPG, SVG ou WebP · 2 Mo max. Apparaît sur vos devis et factures.">
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

        <TextField
          id="siret"
          label="SIRET"
          value={form.siret}
          onChange={(e) => update("siret", e.target.value)}
          placeholder="14 chiffres"
          inputMode="numeric"
          maxLength={17}
          error={errors.siret}
          hint="Optionnel — apparaît sur vos devis et factures"
        />
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

      {/* Section 6 — Apparence */}
      <Section title="Apparence des devis">
        <FieldShell label="Couleur principale" hint="Utilisée sur les en-têtes et badges des devis">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => update("primary_color", e.target.value)}
              aria-label="Choisir la couleur principale"
              className="w-12 h-11 rounded-xl border border-[var(--border)] cursor-pointer"
            />
            <input
              type="text"
              value={form.primary_color}
              onChange={(e) => update("primary_color", e.target.value)}
              className="h-11 px-3 text-sm font-mono bg-white border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 w-32"
            />
          </div>
        </FieldShell>

        <ColorPreview color={form.primary_color} company={form.company || "Mon entreprise"} />
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

function ColorPreview({ color, company }: { color: string; company: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--surface)]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
        Aperçu
      </p>
      <div className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
        <div
          className="px-4 py-3 text-white text-sm font-bold flex items-center justify-between"
          style={{ background: color }}
        >
          <span>{company}</span>
          <span className="text-xs opacity-75">Devis #042</span>
        </div>
        <div className="p-4 text-sm text-[var(--text-secondary)]">
          <div className="flex justify-between mb-1">
            <span>Prestation</span>
            <span className="font-semibold text-[var(--text-primary)]">1 200 €</span>
          </div>
          <div
            className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: color }}
          >
            En attente
          </div>
        </div>
      </div>
    </div>
  );
}
