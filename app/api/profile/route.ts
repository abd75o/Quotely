import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { titleCaseFr } from "@/lib/format/title-case";

// Fields where we auto-title-case at save time so the DB row stays
// consistent across PDF / dashboard / search. Free text the user typed
// in lowercase ("75011 paris") comes back capitalised ("75011 Paris").
const TITLE_CASE_FIELDS = new Set([
  "company",
  "company_name",
  "city",
  "registration_city",
]);

export const runtime = "nodejs";

// Strict allowlist of columns the artisan can update via this endpoint. Any
// other column (notably `plan`, `subscription_status`, `trial_ends_at`) is
// rejected at the boundary — those are controlled by Stripe webhooks and must
// never be writable from a client form, or the `profiles_plan_check` CHECK
// constraint can be tripped by a stray empty string from a stale form state.
const ALLOWED_FIELDS = [
  "first_name",
  "last_name",
  "telephone",
  "company",
  "company_name",
  "siret",
  "legal_status",
  "vat_status",
  "vat_number",
  "address",
  "postal_code",
  "city",
  "iban",
  "bic",
  "metier",
  "metier_principal",
  "logo_url",
  "primary_color",
  "brand_color",
  "hide_branding",
  // Insurance — required for BTP trades on the PDF (mentions légales).
  // Migration 20260523_legal_insurance_and_registration.sql.
  "decennale_company",
  "decennale_number",
  "decennale_zone",
  "rc_pro_company",
  "rc_pro_number",
  // Immatriculation RCS (sociétés) / RM (artisans).
  // Migration 20260523_legal_insurance_and_registration.sql.
  "registration_number",
  "registration_city",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

// Boolean fields don't go through the string-normalization branches below —
// they're handled explicitly so true/false survives the round-trip without
// being squashed to `null` by normalizeString.
const BOOLEAN_FIELDS = new Set<AllowedField>(["hide_branding"]);

const VAT_STATUS_VALUES = new Set([
  "auto_entrepreneur",
  "assujetti",
  "non_assujetti",
]);

// Mirrors the DB CHECK constraint on profiles.legal_status — see
// supabase/migrations/20260511_onboarding_identity.sql. Any value not in this
// set is rejected at the API boundary so the constraint never fires.
const LEGAL_STATUS_VALUES = new Set([
  "auto-entrepreneur",
  "ei",
  "eurl",
  "sarl",
  "sas",
  "autre",
]);

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeSiret(value: unknown): string | null | "invalid" {
  const s = normalizeString(value);
  if (s === null) return null;
  const digits = s.replace(/\s+/g, "");
  if (!/^\d{14}$/.test(digits)) return "invalid";
  return digits;
}

function normalizePostalCode(value: unknown): string | null | "invalid" {
  const s = normalizeString(value);
  if (s === null) return null;
  if (!/^\d{5}$/.test(s)) return "invalid";
  return s;
}

function normalizeIban(value: unknown): string | null | "invalid" {
  const s = normalizeString(value);
  if (s === null) return null;
  const compact = s.replace(/\s+/g, "").toUpperCase();
  // Accept any IBAN length 15-34; tighter format check stays loose because
  // foreign IBANs are valid in France.
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return "invalid";
  return compact;
}

function normalizeBic(value: unknown): string | null | "invalid" {
  const s = normalizeString(value);
  if (s === null) return null;
  const compact = s.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(compact)) return "invalid";
  return compact;
}

// Six-digit hex only — short form (#abc) is rejected so we never have to
// normalise downstream. The DB CHECK constraint uses the same regex.
function normalizeHex(value: unknown): string | null | "invalid" {
  const s = normalizeString(value);
  if (s === null) return null;
  if (!/^#[0-9A-Fa-f]{6}$/.test(s)) return "invalid";
  return s;
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload: Partial<Record<AllowedField, string | boolean | null>> = {};
  const fieldErrors: Record<string, string> = {};

  // hide_branding is Pro-only. We refuse the write at the API boundary so the
  // user can't bypass the locked toggle in the UI by hand-crafting a request.
  // Capture id in this scope so TS doesn't re-widen `user` to nullable inside
  // the closure below.
  const userId = user.id;
  let proPlanChecked = false;
  async function ensurePro(): Promise<boolean> {
    if (proPlanChecked) return true;
    const { data: row } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    const plan = (row as { plan?: string | null } | null)?.plan ?? null;
    if (plan !== "pro") return false;
    proPlanChecked = true;
    return true;
  }

  for (const key of ALLOWED_FIELDS) {
    if (!(key in body)) continue;
    const raw = body[key];

    if (BOOLEAN_FIELDS.has(key)) {
      if (typeof raw !== "boolean") {
        fieldErrors[key] = "Valeur booléenne attendue.";
        continue;
      }
      if (key === "hide_branding") {
        const ok = await ensurePro();
        if (!ok) {
          fieldErrors.hide_branding =
            "Réservé au plan Pro. Passez Pro pour masquer la mention Quovi.";
          continue;
        }
      }
      payload[key] = raw;
      continue;
    }

    if (key === "siret") {
      const v = normalizeSiret(raw);
      if (v === "invalid") {
        fieldErrors.siret = "Le SIRET doit contenir 14 chiffres.";
        continue;
      }
      payload.siret = v;
      continue;
    }
    if (key === "postal_code") {
      const v = normalizePostalCode(raw);
      if (v === "invalid") {
        fieldErrors.postal_code = "Code postal invalide (5 chiffres).";
        continue;
      }
      payload.postal_code = v;
      continue;
    }
    if (key === "iban") {
      const v = normalizeIban(raw);
      if (v === "invalid") {
        fieldErrors.iban = "IBAN invalide.";
        continue;
      }
      payload.iban = v;
      continue;
    }
    if (key === "bic") {
      const v = normalizeBic(raw);
      if (v === "invalid") {
        fieldErrors.bic = "BIC invalide (8 ou 11 caractères).";
        continue;
      }
      payload.bic = v;
      continue;
    }
    if (key === "brand_color") {
      const v = normalizeHex(raw);
      if (v === "invalid") {
        fieldErrors.brand_color = "Couleur invalide. Format attendu : #RRGGBB.";
        continue;
      }
      payload.brand_color = v;
      continue;
    }
    if (key === "vat_status") {
      const v = normalizeString(raw);
      if (v && !VAT_STATUS_VALUES.has(v)) {
        fieldErrors.vat_status = "Statut TVA inconnu.";
        continue;
      }
      payload.vat_status = v;
      continue;
    }
    if (key === "legal_status") {
      const v = normalizeString(raw);
      if (v && !LEGAL_STATUS_VALUES.has(v.toLowerCase())) {
        fieldErrors.legal_status = "Forme juridique inconnue.";
        continue;
      }
      payload.legal_status = v ? v.toLowerCase() : null;
      continue;
    }

    // Generic string field: trim, null-on-empty. Non-string values are
    // silently dropped — keeps malformed payloads from poisoning the row.
    if (typeof raw === "string") {
      const normalised = normalizeString(raw);
      payload[key] =
        normalised && TITLE_CASE_FIELDS.has(key)
          ? titleCaseFr(normalised)
          : normalised;
    } else if (raw === null) {
      payload[key] = null;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return Response.json(
      { error: "Validation failed", fieldErrors },
      { status: 422 },
    );
  }

  if (Object.keys(payload).length === 0) {
    return Response.json(
      { error: "No allowed field in payload" },
      { status: 400 },
    );
  }

  // Mirror company → company_name so legacy code paths reading the older
  // column keep working.
  if (payload.company && !payload.company_name) {
    payload.company_name = payload.company;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ profile: data ?? {} });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ profile: data ?? {} });
}
