import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { resolveMentionsLegales, isVatSubject } from "./mentions-legales";
import {
  formatCompanyName,
  formatFullName,
  formatClientName,
} from "@/lib/text/name-normalize";
import { shouldShowBranding } from "@/lib/branding/should-show";
import { formatSiret as formatSiretShared } from "@/lib/format/siret";

// ─── Design system ─────────────────────────────────────────────────────────
// Quovi PDF v2 — modern, premium, indigo accent. Re-skinning the document is
// a one-line change here (palette + DEFAULT_ACCENT). react-pdf does NOT
// support CSS variables, so the accent is threaded through buildStyles().
export const palette = {
  ink: "#0F172A",          // slate-900 — strong headings + grand total
  text: "#1F2937",         // slate-800 — body copy
  textMuted: "#475569",    // slate-600 — secondary text
  label: "#94A3B8",        // slate-400 — uppercase labels
  hairline: "#E5E7EB",     // gray-200  — separators
  surfaceSoft: "#F8F9FB",  // near-white  — zebra rows + totals card
  white: "#FFFFFF",
  statusPending: "#F59E0B",
  statusRefused: "#DC2626",
  statusDraft: "#94A3B8",
} as const;

// Indigo per spec; resolveAccent() lets the artisan brand_color override.
const DEFAULT_ACCENT = "#6366F1";
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// react-pdf bundles Helvetica + Courier; no Font.register call avoids
// shipping TTFs in the serverless bundle. Mono for digits sells the
// "modern receipt" feel without a custom font drop.
export const fonts = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
  mono: "Courier",
  monoBold: "Courier-Bold",
} as const;

// ─── Public shape ──────────────────────────────────────────────────────────
export interface QuoteLineRow {
  id?: string;
  label: string;
  quantity: number;
  unite?: string | null;
  price: number;
  tva?: number;
}

export interface PdfQuote {
  number: string;
  status: string;
  created_at: string;
  valid_until: string | null;
  items: QuoteLineRow[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string | null;
  acompte_percent?: number | null;
  /**
   * Free-form payment schedule the artisan typed in. If present, it OVERRIDES
   * the default 30/40/30 split and is rendered verbatim. Multi-line accepted.
   */
  payment_terms?: string | null;
  /** ISO timestamp; rendered in the signature block when status is signed. */
  signed_at?: string | null;
  /** Free-form signer label captured at signing time. */
  signed_by?: string | null;
  /** Stored as JSON in DB; usually `{ name, email, signed_at, signature_image_url }`. */
  signature_data?: Record<string, unknown> | null;
  /** Public token used for the signature link — last 4 chars are surfaced in the signed block. */
  signature_token?: string | null;
}

export interface PdfProfile {
  company_name?: string | null;
  company?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  metier?: string | null;
  metier_principal?: string | null;
  siret?: string | null;
  legal_status?: string | null;
  vat_status?: string | null;
  vat_number?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  telephone?: string | null;
  email?: string | null;
  iban?: string | null;
  bic?: string | null;
  logo_url?: string | null;
  /** Optional artisan-supplied signature image (PNG/JPEG URL). */
  signature_url?: string | null;
  /** Canonical brand accent — added in 20260518_brand_color. */
  brand_color?: string | null;
  /** Legacy aliases kept as PDF-side fallback while back-fill runs. */
  couleur_principale?: string | null;
  primary_color?: string | null;
  rc_pro_number?: string | null;
  rc_pro_company?: string | null;
  decennale_number?: string | null;
  decennale_company?: string | null;
  decennale_zone?: string | null;
  // Immatriculation : RCS pour sociétés, RM pour artisans/EI. Rendu adapté
  // par `formatRegistration()` ci-dessous selon legal_status.
  registration_number?: string | null;
  registration_city?: string | null;
  bank_name?: string | null;
  plan?: string | null;
  hide_branding?: boolean | null;
}

export interface PdfClient {
  name: string;
  first_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  telephone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  type_client?: "particulier" | "professionnel" | null;
  siret?: string | null;
  /** "M.", "Mme", "Mlle" — when set, prepended to the displayed name. */
  civility?: string | null;
}

// ─── Formatters ────────────────────────────────────────────────────────────
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTimeFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })} à ${d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    })} (Paris)`;
  } catch {
    return "—";
  }
}

/**
 * `Intl.NumberFormat('fr-FR', { style: 'currency' })` uses U+202F (narrow
 * no-break space) which Helvetica can't render in react-pdf, so we hand-roll
 * grouping and append the € manually.
 *
 * NOWRAP : react-pdf n'expose PAS `white-space: nowrap` (absent du type Style).
 * L'équivalent fiable est d'utiliser l'espace INSÉCABLE U+00A0 — présent dans
 * l'encodage WinAnsi des polices standard (Helvetica/Courier), rendu à la même
 * largeur qu'une espace mais que l'algo de césure ne coupe jamais. Sans ça, le
 * "TOTAL TTC 12 345,67 €" (fontSize 20, carte totaux étroite à 42%) cassait au
 * milieu du nombre sur la 1re page. On groupe les milliers ET on relie le « € »
 * avec U+00A0 pour que le montant reste d'un seul tenant.
 */
const NBSP = " ";
export function formatEuros(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = n < 0 ? "-" : "";
  return `${sign}${grouped},${decPart}${NBSP}€`;
}

export function companyDisplay(p: PdfProfile): string {
  // No "Prestataire" fallback: if every identifying field is empty the profile
  // is broken upstream and we surface the empty string so the PDF reviewer
  // immediately spots the data hole instead of shipping a generic label.
  const company = (p.company_name || p.company || "").trim();
  if (company) return formatCompanyName(company);
  const person = formatFullName(p.first_name, p.last_name);
  if (person) return person;
  return (p.email || "").trim();
}

export function clientDisplay(c: PdfClient): string {
  // Same no-fallback policy as companyDisplay — a generic "Client" on a legal
  // document hides a real bug (broken embed / missing client_id) so we let
  // the empty string render and force a fix upstream. formatClientName gère le
  // cas personne ("Marc DUPONT") vs raison sociale seule ("Linkity").
  const base = formatClientName({ first_name: c.first_name, name: c.name });
  if (!base) return "";
  // Civility (M./Mme/Mlle) is rendered verbatim so the dot stays attached and
  // the casing the user typed is preserved.
  return c.civility ? `${c.civility.trim()} ${base}` : base;
}

export function formatSiret(siret: string | null | undefined): string | null {
  if (!siret) return null;
  const formatted = formatSiretShared(siret);
  // Fall back to the raw value when the input isn't 14 digits — better to
  // show "SIRET 1234" than nothing on a legacy / malformed row.
  return formatted || siret;
}

/**
 * Build the RCS/RM mention string for the legal banner. Sociétés render as
 * "RCS Paris 853 271 064", artisans as "RM 853 271 064", and a missing
 * legal_status falls back to a generic "N° 853 271 064" rather than
 * picking the wrong label (the artisan can fix the status from onboarding).
 */
const RCS_LEGAL_STATUSES_PDF = new Set(["sarl", "sas", "sasu", "eurl"]);
const RM_LEGAL_STATUSES_PDF = new Set(["ei", "auto-entrepreneur"]);

export function formatRegistration(profile: PdfProfile): string | null {
  const number = profile.registration_number?.trim();
  if (!number) return null;
  const status = (profile.legal_status ?? "").toLowerCase().trim();
  if (RCS_LEGAL_STATUSES_PDF.has(status)) {
    const city = profile.registration_city?.trim();
    return city ? `RCS ${city} ${number}` : `RCS ${number}`;
  }
  if (RM_LEGAL_STATUSES_PDF.has(status)) {
    return `RM ${number}`;
  }
  return `N° ${number}`;
}

export function formatIban(iban: string | null | undefined): string | null {
  if (!iban) return null;
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return compact;
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

export function resolveAccent(p: PdfProfile): string {
  for (const candidate of [p.brand_color, p.couleur_principale, p.primary_color]) {
    if (candidate && HEX_RE.test(candidate)) return candidate;
  }
  return DEFAULT_ACCENT;
}

function isSignedStatus(status: string): boolean {
  return status === "signed" || status === "invoiced";
}

interface StatusDescriptor {
  label: string;
  bg: string;
}

function statusDescriptor(status: string, accent: string): StatusDescriptor {
  switch (status) {
    case "signed":
      return { label: "Signé", bg: accent };
    case "invoiced":
      return { label: "Facturé", bg: accent };
    case "refused":
      return { label: "Refusé", bg: palette.statusRefused };
    case "draft":
      return { label: "Brouillon", bg: palette.statusDraft };
    case "sent":
    case "pending":
    case "viewed":
    default:
      return { label: "En attente", bg: palette.statusPending };
  }
}

// NOTE: there is deliberately NO default payment schedule anymore. The PDF must
// reflect EXACTLY what the artisan configured — a fabricated 30/40/30 split was
// printing an "échéancier" nobody asked for (see PaymentScheduleBlock).

// ─── StyleSheet ────────────────────────────────────────────────────────────
export function buildStyles(accent: string) {
  return StyleSheet.create({
    // 48pt margins, with extra paddingBottom for the fixed page footer.
    page: {
      paddingTop: 44,
      paddingBottom: 64,
      paddingHorizontal: 44,
      fontSize: 10.5,
      fontFamily: fonts.regular,
      color: palette.text,
      lineHeight: 1.5,
    },

    // ── Header ─────────────────────────────────────────────────────────
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 22,
    },
    headerBrand: {
      maxWidth: "55%",
    },
    headerLogo: {
      maxHeight: 80,
      maxWidth: 200,
      objectFit: "contain",
    },
    headerCompanyText: {
      fontSize: 22,
      fontFamily: fonts.bold,
      color: palette.ink,
      letterSpacing: -0.3,
    },
    headerMeta: {
      alignItems: "flex-end",
    },
    documentTitle: {
      fontSize: 32,
      fontFamily: fonts.bold,
      color: accent,
      letterSpacing: -0.6,
      lineHeight: 1,
    },
    documentNumberBadge: {
      marginTop: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.hairline,
      backgroundColor: palette.white,
    },
    documentNumberText: {
      fontSize: 10,
      fontFamily: fonts.bold,
      color: palette.text,
      letterSpacing: 0.4,
    },
    documentDate: {
      marginTop: 10,
      fontSize: 9.5,
      color: palette.textMuted,
      textAlign: "right",
      lineHeight: 1.4,
    },
    statusPill: {
      marginTop: 10,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: accent,
    },
    statusPillText: {
      fontSize: 8.5,
      fontFamily: fonts.bold,
      color: palette.white,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    headerDivider: {
      borderBottomWidth: 1,
      borderBottomColor: palette.hairline,
      marginBottom: 22,
    },

    // ── Parties (50/50, low-key labels) ────────────────────────────────
    parties: {
      flexDirection: "row",
      gap: 24,
      marginBottom: 26,
    },
    party: {
      flex: 1,
    },
    partyLabel: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.label,
      textTransform: "uppercase",
      marginBottom: 8,
      letterSpacing: 0.6,
    },
    partyName: {
      fontSize: 14,
      fontFamily: fonts.bold,
      color: palette.ink,
      marginBottom: 4,
    },
    partyLine: {
      fontSize: 11,
      color: palette.textMuted,
      lineHeight: 1.55,
    },
    partyMutedNote: {
      fontSize: 9,
      color: palette.label,
      marginTop: 4,
      lineHeight: 1.4,
    },

    // ── Items table (indigo header, zebra rows) ─────────────────────────
    table: {
      marginBottom: 8,
    },
    tableHead: {
      flexDirection: "row",
      backgroundColor: accent,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
    },
    th: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.white,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.hairline,
    },
    tableRowZebra: {
      backgroundColor: palette.surfaceSoft,
    },

    // Column widths (sum = 100%):
    // DESCRIPTION 40 | QTÉ 10 | UNITÉ 10 | PU HT 15 | TVA 10 | TOTAL HT 15
    cellDesc: { width: "40%", color: palette.ink, fontSize: 10.5, paddingRight: 6 },
    cellQty: {
      width: "10%",
      textAlign: "center",
      color: palette.text,
      fontSize: 10,
      fontFamily: fonts.mono,
    },
    cellUnit: {
      width: "10%",
      textAlign: "center",
      color: palette.textMuted,
      fontSize: 10,
    },
    cellPu: {
      width: "15%",
      textAlign: "right",
      color: palette.text,
      fontSize: 10,
      fontFamily: fonts.mono,
    },
    cellTva: {
      width: "10%",
      textAlign: "center",
      color: palette.textMuted,
      fontSize: 10,
      fontFamily: fonts.mono,
    },
    cellTotal: {
      width: "15%",
      textAlign: "right",
      color: palette.ink,
      fontSize: 10,
      fontFamily: fonts.monoBold,
    },

    // ── Totals card (bottom-right, 40% width) ──────────────────────────
    totalsWrap: {
      marginTop: 18,
      alignItems: "flex-end",
    },
    totalsBox: {
      width: "42%",
      backgroundColor: palette.surfaceSoft,
      borderWidth: 1,
      borderColor: palette.hairline,
      borderRadius: 10,
      padding: 16,
    },
    totalLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingVertical: 4,
    },
    totalLabel: {
      fontSize: 11,
      color: palette.textMuted,
    },
    totalValue: {
      fontSize: 11,
      color: palette.text,
      fontFamily: fonts.monoBold,
    },
    totalDivider: {
      borderTopWidth: 1,
      borderTopColor: palette.hairline,
      marginTop: 8,
      marginBottom: 10,
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    grandTotalLabel: {
      fontSize: 10,
      fontFamily: fonts.bold,
      color: palette.label,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    grandTotalValue: {
      fontSize: 20,
      fontFamily: fonts.monoBold,
      color: accent,
      letterSpacing: -0.4,
    },

    // ── Section blocks (Échéancier / Validité / Bank / Notes) ──────────
    section: {
      marginTop: 22,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: fonts.bold,
      color: palette.label,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    sectionLine: {
      fontSize: 11,
      color: palette.text,
      lineHeight: 1.55,
    },
    sectionLineMuted: {
      fontSize: 10,
      color: palette.textMuted,
      lineHeight: 1.5,
      marginTop: 6,
    },
    paymentRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
    },
    paymentBulletWrap: {
      width: 12,
      alignItems: "center",
    },
    paymentBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: accent,
    },
    paymentPercent: {
      width: 56,
      fontSize: 11,
      fontFamily: fonts.monoBold,
      color: palette.ink,
      marginLeft: 4,
    },
    paymentLabel: {
      flex: 1,
      fontSize: 11,
      color: palette.text,
    },
    paymentAmount: {
      fontSize: 11,
      fontFamily: fonts.monoBold,
      color: palette.ink,
    },

    // ── Signature ──────────────────────────────────────────────────────
    signatureWrap: {
      marginTop: 28,
    },
    signatureTitle: {
      fontSize: 10,
      fontFamily: fonts.bold,
      color: accent,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    signatureGrid: {
      flexDirection: "row",
      gap: 16,
    },
    signatureBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.hairline,
      borderRadius: 8,
      padding: 14,
      minHeight: 110,
    },
    signatureBoxLabel: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.label,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    signatureBoxName: {
      fontSize: 11,
      fontFamily: fonts.bold,
      color: palette.ink,
      marginBottom: 4,
    },
    signatureImage: {
      width: 140,
      height: 50,
      marginBottom: 6,
      objectFit: "contain",
    },
    signaturePlaceholder: {
      flex: 1,
      borderTopWidth: 1,
      borderTopColor: palette.hairline,
      borderStyle: "dashed",
      marginTop: 24,
    },
    signatureDate: {
      fontSize: 9.5,
      color: palette.textMuted,
      marginTop: 6,
    },
    signedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    signedDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: accent,
    },

    // ── Legal mentions ─────────────────────────────────────────────────
    mentions: {
      marginTop: 32,
    },
    mentionLine: {
      fontSize: 8,
      color: palette.textMuted,
      fontFamily: fonts.italic,
      lineHeight: 1.5,
    },
    mentionBullet: {
      fontSize: 8,
      color: palette.textMuted,
      fontFamily: fonts.italic,
      lineHeight: 1.5,
      marginTop: 2,
    },

    // ── Footer (fixed bottom of every page) ────────────────────────────
    pageFooter: {
      position: "absolute",
      bottom: 24,
      left: 44,
      right: 44,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    footerLeft: {
      fontSize: 8,
      color: palette.label,
    },
    // Branding link: previously coloured with the brand `accent` (often a
    // loud indigo) which made the line dominate the footer. Switched to
    // palette.label (#94A3B8 — same grey as the quote number on the left)
    // so the line stays discreet on every plan. The Starter variant keeps
    // a slightly bigger / bolder weight to nudge upgrades without
    // re-introducing the colour clash.
    footerBrandLink: {
      fontSize: 8,
      color: palette.label,
      textDecoration: "none",
    },
    footerBrandLinkStarter: {
      fontSize: 9,
      fontFamily: fonts.bold,
      // Same grey as footerBrandLink — the only differentiator with the Pro
      // variant is now weight + size, no longer the brand-accent colour.
      color: palette.label,
      textDecoration: "none",
    },
    footerRight: {
      fontSize: 8,
      color: palette.label,
    },
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────
function PdfHeader(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  quote: PdfQuote;
  accent: string;
  companyName: string;
}) {
  const { styles, profile, quote, accent, companyName } = props;
  const status = statusDescriptor(quote.status, accent);
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          {profile.logo_url ? (
            <Image src={profile.logo_url} style={styles.headerLogo} />
          ) : (
            <Text style={styles.headerCompanyText}>{companyName}</Text>
          )}
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.documentTitle}>DEVIS</Text>
          <View style={styles.documentNumberBadge}>
            <Text style={styles.documentNumberText}>N° {quote.number}</Text>
          </View>
          <Text style={styles.documentDate}>
            Émis le {formatDate(quote.created_at)}
            {"\n"}
            {quote.valid_until
              ? `Valable jusqu'au ${formatDate(quote.valid_until)}`
              : "Validité 90 jours"}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={styles.statusPillText}>{status.label}</Text>
          </View>
        </View>
      </View>
      <View style={styles.headerDivider} />
    </View>
  );
}

export function EmitterReceiver(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  client: PdfClient;
  companyName: string;
  mentions: ReturnType<typeof resolveMentionsLegales>;
}) {
  const { styles, profile, client, companyName, mentions } = props;
  return (
    <View style={styles.parties}>
      <View style={styles.party}>
        <Text style={styles.partyLabel}>Émetteur</Text>
        <Text style={styles.partyName}>{companyName}</Text>
        {profile.legal_status && (
          // Show the forme juridique (SARL / SAS / EI / auto-entrepreneur…)
          // directly in the Émetteur card too — previously it was only in
          // the bottom legal banner, which a client glancing at the
          // recipient block could miss. Required by art. R123-237 du
          // Code de commerce on every commercial document.
          <Text style={[styles.partyLine, { fontFamily: fonts.italic }]}>
            {profile.legal_status}
          </Text>
        )}
        {profile.address && (
          <Text style={styles.partyLine}>{profile.address}</Text>
        )}
        {(profile.postal_code || profile.city) && (
          <Text style={styles.partyLine}>
            {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
          </Text>
        )}
        {profile.telephone && (
          <Text style={styles.partyLine}>Tél : {profile.telephone}</Text>
        )}
        {profile.email && <Text style={styles.partyLine}>{profile.email}</Text>}
        {profile.siret && (
          <Text style={[styles.partyLine, { marginTop: 4 }]}>
            SIRET : {formatSiret(profile.siret)}
          </Text>
        )}
        {formatRegistration(profile) && (
          <Text style={styles.partyLine}>{formatRegistration(profile)}</Text>
        )}
        {profile.vat_number && (
          <Text style={styles.partyLine}>
            TVA intra. : {profile.vat_number}
          </Text>
        )}
        {mentions.tvaNote && (
          <Text style={styles.partyMutedNote}>{mentions.tvaNote}</Text>
        )}
      </View>

      <View style={styles.party}>
        <Text style={styles.partyLabel}>Destinataire</Text>
        <Text style={styles.partyName}>{clientDisplay(client)}</Text>
        {client.company_name && (
          <Text
            style={[
              styles.partyLine,
              { fontFamily: fonts.bold, marginBottom: 2 },
            ]}
          >
            {formatCompanyName(client.company_name)}
          </Text>
        )}
        {client.address && (
          <Text style={styles.partyLine}>{client.address}</Text>
        )}
        {(client.postal_code || client.city) && (
          <Text style={styles.partyLine}>
            {[client.postal_code, client.city].filter(Boolean).join(" ")}
          </Text>
        )}
        {client.email && <Text style={styles.partyLine}>{client.email}</Text>}
        {(client.telephone || client.phone) && (
          <Text style={styles.partyLine}>
            Tél : {client.telephone ?? client.phone}
          </Text>
        )}
        {client.siret && (
          <Text style={[styles.partyLine, { marginTop: 4 }]}>
            SIRET : {formatSiret(client.siret)}
          </Text>
        )}
      </View>
    </View>
  );
}

export function LineItemsTable(props: {
  styles: ReturnType<typeof buildStyles>;
  quote: PdfQuote;
}) {
  const { styles, quote } = props;
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.th, { width: "40%" }]}>Description</Text>
        <Text style={[styles.th, { width: "10%", textAlign: "center" }]}>Qté</Text>
        <Text style={[styles.th, { width: "10%", textAlign: "center" }]}>Unité</Text>
        <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>PU HT</Text>
        <Text style={[styles.th, { width: "10%", textAlign: "center" }]}>TVA</Text>
        <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>Total HT</Text>
      </View>
      {quote.items.map((line, idx) => {
        const qty = Number(line.quantity || 1);
        const ht = Number(line.price) * qty;
        const zebra = idx % 2 === 1;
        return (
          <View
            key={line.id ?? idx}
            style={[styles.tableRow, zebra ? styles.tableRowZebra : null].filter(Boolean) as Style[]}
            wrap={false}
          >
            <Text style={styles.cellDesc}>{line.label}</Text>
            <Text style={styles.cellQty}>{qty}</Text>
            <Text style={styles.cellUnit}>{line.unite ?? "—"}</Text>
            <Text style={styles.cellPu}>{formatEuros(line.price)}</Text>
            <Text style={styles.cellTva}>
              {Number(line.tva ?? quote.tax_rate)}%
            </Text>
            <Text style={styles.cellTotal}>{formatEuros(ht)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TotalsBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  quote: PdfQuote;
}) {
  const { styles, quote } = props;

  // Group TVA by rate so a mixed-rate quote shows one line per rate.
  const grouped = new Map<number, { base: number; tax: number }>();
  for (const it of quote.items) {
    const rate = Number(it.tva ?? quote.tax_rate);
    const base = Number(it.price) * Number(it.quantity || 1);
    const bucket = grouped.get(rate) ?? { base: 0, tax: 0 };
    bucket.base += base;
    bucket.tax += base * (rate / 100);
    grouped.set(rate, bucket);
  }
  const hasMultiTva = grouped.size > 1;

  return (
    <View style={styles.totalsWrap}>
      <View style={styles.totalsBox}>
        <View style={styles.totalLine}>
          <Text style={styles.totalLabel}>Sous-total HT</Text>
          <Text style={styles.totalValue}>{formatEuros(quote.subtotal)}</Text>
        </View>

        {hasMultiTva
          ? Array.from(grouped.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([rate, b]) => (
                <View key={rate} style={styles.totalLine}>
                  <Text style={styles.totalLabel}>
                    TVA {rate}% (sur {formatEuros(b.base)})
                  </Text>
                  <Text style={styles.totalValue}>{formatEuros(b.tax)}</Text>
                </View>
              ))
          : (() => {
              const onlyRate =
                grouped.size === 1 ? Array.from(grouped.entries())[0] : null;
              const rate = onlyRate ? onlyRate[0] : quote.tax_rate;
              const tax = onlyRate ? onlyRate[1].tax : quote.tax_amount;
              return (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>TVA {rate}%</Text>
                  <Text style={styles.totalValue}>{formatEuros(tax)}</Text>
                </View>
              );
            })()}

        <View style={styles.totalDivider} />

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total TTC</Text>
          <Text style={styles.grandTotalValue}>{formatEuros(quote.total)}</Text>
        </View>
      </View>
    </View>
  );
}

function PaymentScheduleBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  quote: PdfQuote;
}) {
  const { styles, quote } = props;

  // A free-form multi-line schedule the artisan explicitly typed takes priority
  // and is rendered verbatim.
  const terms =
    typeof quote.payment_terms === "string" ? quote.payment_terms.trim() : "";
  const hasTerms = terms.length > 0;

  // A simple deposit (acompte) → render ONLY "Acompte X% à la signature" + the
  // balance. Two lines, never a 3-stage split.
  const acompte = Number.isFinite(quote.acompte_percent ?? NaN)
    ? Number(quote.acompte_percent)
    : null;
  const hasAcompte = acompte !== null && acompte > 0 && acompte < 100;

  // Nothing configured → no payment section at all. We never fabricate a
  // default échéancier.
  if (!hasTerms && !hasAcompte) return null;

  const depositAmount = hasAcompte
    ? +(quote.total * (acompte! / 100)).toFixed(2)
    : 0;
  const balanceAmount = +(quote.total - depositAmount).toFixed(2);

  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>
        {hasTerms ? "Échéancier" : "Modalités de paiement"}
      </Text>
      {hasTerms ? (
        terms
          .split(/\r?\n/)
          .filter((l) => l.trim())
          .map((line, i) => (
            <Text key={i} style={styles.sectionLine}>
              {line}
            </Text>
          ))
      ) : (
        <>
          <View style={styles.paymentRow}>
            <View style={styles.paymentBulletWrap}>
              <View style={styles.paymentBullet} />
            </View>
            <Text style={styles.paymentPercent}>{acompte}%</Text>
            <Text style={styles.paymentLabel}>Acompte à la signature</Text>
            <Text style={styles.paymentAmount}>
              {formatEuros(depositAmount)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <View style={styles.paymentBulletWrap}>
              <View style={styles.paymentBullet} />
            </View>
            <Text style={styles.paymentPercent}>{100 - acompte!}%</Text>
            <Text style={styles.paymentLabel}>Solde à la réception</Text>
            <Text style={styles.paymentAmount}>
              {formatEuros(balanceAmount)}
            </Text>
          </View>
        </>
      )}
      <Text style={styles.sectionLineMuted}>
        Délai de paiement : 30 jours à compter de la facturation, sauf mention
        contraire.
      </Text>
    </View>
  );
}

function ValidityNotesBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  quote: PdfQuote;
  hasDecennale: boolean;
}) {
  const { styles, quote, hasDecennale } = props;
  if (!quote.notes && !hasDecennale && !quote.valid_until) return null;
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>Validité & conditions</Text>
      <Text style={styles.sectionLine}>
        {quote.valid_until
          ? `Devis valable jusqu'au ${formatDate(quote.valid_until)}.`
          : "Devis valable 90 jours à compter de l'émission."}
        {hasDecennale ? " Garantie décennale incluse." : ""}
      </Text>
      {quote.notes ? (
        <Text style={[styles.sectionLineMuted, { marginTop: 6 }]}>
          {quote.notes}
        </Text>
      ) : null}
    </View>
  );
}

export function BankBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  companyName: string;
}) {
  const { styles, profile, companyName } = props;
  if (!profile.iban && !profile.bic) return null;
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>
        Coordonnées bancaires (règlement par virement)
      </Text>
      <Text style={styles.sectionLine}>Bénéficiaire : {companyName}</Text>
      {profile.iban && (
        <Text style={styles.sectionLine}>IBAN : {formatIban(profile.iban)}</Text>
      )}
      {profile.bic && (
        <Text style={styles.sectionLine}>BIC : {profile.bic.toUpperCase()}</Text>
      )}
      {profile.bank_name && (
        <Text style={styles.sectionLine}>Banque : {profile.bank_name}</Text>
      )}
    </View>
  );
}

function SignatureBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  quote: PdfQuote;
  companyName: string;
  client: PdfClient;
}) {
  const { styles, profile, quote, companyName, client } = props;
  const sig = quote.signature_data ?? null;
  const signedAt =
    quote.signed_at ?? (sig && typeof sig === "object" && (sig.signed_at as string)) ?? null;
  const signedBy =
    quote.signed_by ??
    (sig && typeof sig === "object" && ((sig.name as string) || (sig.signer as string))) ??
    null;
  const clientSignatureImage =
    sig && typeof sig === "object" && (sig.signature_image_url as string)
      ? (sig.signature_image_url as string)
      : null;
  const artisanSignatureImage = profile.signature_url ?? null;
  const showSigned = isSignedStatus(quote.status) && (signedAt || signedBy);

  return (
    <View style={styles.signatureWrap} wrap={false}>
      <Text style={styles.signatureTitle}>Bon pour accord</Text>
      <View style={styles.signatureGrid}>
        {/* Artisan side */}
        <View style={styles.signatureBox}>
          <Text style={styles.signatureBoxLabel}>L'entreprise</Text>
          <Text style={styles.signatureBoxName}>{companyName}</Text>
          {artisanSignatureImage ? (
            <Image src={artisanSignatureImage} style={styles.signatureImage} />
          ) : (
            <View style={styles.signaturePlaceholder} />
          )}
          <Text style={styles.signatureDate}>
            Date : {formatDateShort(quote.created_at)}
          </Text>
        </View>

        {/* Client side */}
        <View style={styles.signatureBox}>
          <Text style={styles.signatureBoxLabel}>Le client</Text>
          <Text style={styles.signatureBoxName}>
            {showSigned && signedBy ? signedBy : clientDisplay(client)}
          </Text>
          {showSigned && clientSignatureImage ? (
            <Image src={clientSignatureImage} style={styles.signatureImage} />
          ) : showSigned ? (
            <View style={styles.signedBadge}>
              <View style={styles.signedDot} />
              <Text style={styles.signatureDate}>Signature électronique validée</Text>
            </View>
          ) : (
            <>
              <View style={styles.signaturePlaceholder} />
              <Text style={[styles.signatureDate, { fontFamily: fonts.italic }]}>
                Précédée de la mention « Bon pour travaux »
              </Text>
            </>
          )}
          {showSigned && signedAt && (
            <Text style={styles.signatureDate}>
              Le {formatDateTimeFr(signedAt)}
            </Text>
          )}
          {showSigned && quote.signature_token && (
            <Text style={[styles.signatureDate, { marginTop: 2 }]}>
              Réf. ••••{quote.signature_token.slice(-4).toUpperCase()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function LegalMentions(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  companyName: string;
  mentions: ReturnType<typeof resolveMentionsLegales>;
}) {
  const { styles, profile, companyName, mentions } = props;
  // Ligne TVA : la mention d'exonération (293 B / non applicable) prime ;
  // sinon "Assujetti TVA" UNIQUEMENT pour un profil réellement assujetti.
  // Auparavant le fallback affichait "Assujetti TVA" pour TOUS les statuts non
  // reconnus — y compris les auto-entrepreneurs — ce qui était faux.
  const tvaMentionLine = mentions.tvaNote
    ? mentions.tvaNote
    : profile.vat_number
      ? `Assujetti TVA — n° ${profile.vat_number}`
      : isVatSubject(profile.vat_status)
        ? "Assujetti TVA"
        : null;
  return (
    <View style={styles.mentions} wrap={false}>
      <Text style={styles.mentionLine}>
        {companyName}
        {profile.legal_status ? ` — ${profile.legal_status}` : ""}
        {profile.siret ? ` — SIRET ${formatSiret(profile.siret)}` : ""}
        {formatRegistration(profile)
          ? ` — ${formatRegistration(profile)}`
          : ""}
      </Text>
      {(profile.address || profile.postal_code || profile.city) && (
        <Text style={styles.mentionLine}>
          {[
            profile.address,
            [profile.postal_code, profile.city].filter(Boolean).join(" "),
          ]
            .filter(Boolean)
            .join(", ")}
        </Text>
      )}
      {tvaMentionLine && (
        <Text style={styles.mentionLine}>{tvaMentionLine}</Text>
      )}
      {profile.decennale_number && (
        <Text style={styles.mentionLine}>
          Garantie décennale :{" "}
          {profile.decennale_company
            ? `${profile.decennale_company} n°${profile.decennale_number}`
            : profile.decennale_number}
          {profile.decennale_zone ? ` — ${profile.decennale_zone}` : ""}
        </Text>
      )}
      {profile.rc_pro_number && (
        <Text style={styles.mentionLine}>
          RC professionnelle :{" "}
          {profile.rc_pro_company
            ? `${profile.rc_pro_company} n°${profile.rc_pro_number}`
            : profile.rc_pro_number}
        </Text>
      )}
      {[...mentions.generales, ...mentions.garanties, ...mentions.specifiques]
        .filter(Boolean)
        .filter((m) => !shadowsRenderedInsurance(m, profile))
        .map((m, i) => (
          <Text key={i} style={styles.mentionBullet}>
            • {m}
          </Text>
        ))}
    </View>
  );
}

/**
 * Drop the generic "RC professionnelle" / "Garantie décennale" bullets
 * from the metier mentions when the artisan has already supplied the
 * detailed insurance fields — otherwise the PDF renders the detailed line
 * ("RC professionnelle : MAAF n°…") AND a bare bullet right after, which
 * reads as a missing-data placeholder.
 *
 * We match loosely (case-insensitive substring) so variants like
 * "Garantie décennale (numéro de police obligatoire)" or "RC pro" all
 * collapse into the detailed line above them.
 */
function shadowsRenderedInsurance(mention: string, profile: PdfProfile): boolean {
  const m = mention.toLowerCase();
  if (profile.rc_pro_number && m.includes("rc professionnelle")) return true;
  if (profile.rc_pro_number && m.includes("rc pro")) return true;
  if (profile.decennale_number && m.includes("garantie décennale")) return true;
  if (profile.decennale_number && m.includes("decennale")) return true;
  return false;
}

// ─── Document ──────────────────────────────────────────────────────────────
export function QuotePdfDocument({
  quote,
  profile,
  client,
}: {
  quote: PdfQuote;
  profile: PdfProfile;
  client: PdfClient;
}) {
  const accent = resolveAccent(profile);
  const styles = buildStyles(accent);
  const mentions = resolveMentionsLegales({
    metier: profile.metier_principal || profile.metier,
    typeClient: client.type_client ?? "particulier",
    vatStatus: profile.vat_status,
  });

  const companyName = companyDisplay(profile);
  const showBranding = shouldShowBranding(profile.plan, profile.hide_branding);
  // Pro = subtle footer link; Starter/Free = slightly louder but still
  // restrained. The boolean tells us whether to show it at all; here we
  // choose the visual weight.
  const isViralPlan = profile.plan === "free" || profile.plan === "starter";

  return (
    <Document
      title={`Devis ${quote.number} - ${companyName}`}
      author={companyName}
      creator={companyName}
      producer={companyName}
    >
      <Page size="A4" style={styles.page}>
        <PdfHeader
          styles={styles}
          profile={profile}
          quote={quote}
          accent={accent}
          companyName={companyName}
        />

        <EmitterReceiver
          styles={styles}
          profile={profile}
          client={client}
          companyName={companyName}
          mentions={mentions}
        />

        <LineItemsTable styles={styles} quote={quote} />

        <TotalsBlock styles={styles} quote={quote} />

        <PaymentScheduleBlock styles={styles} quote={quote} />

        <ValidityNotesBlock
          styles={styles}
          quote={quote}
          hasDecennale={Boolean(profile.decennale_number)}
        />

        <BankBlock styles={styles} profile={profile} companyName={companyName} />

        <SignatureBlock
          styles={styles}
          profile={profile}
          quote={quote}
          companyName={companyName}
          client={client}
        />

        <LegalMentions
          styles={styles}
          profile={profile}
          companyName={companyName}
          mentions={mentions}
        />

        {/* Fixed page footer — quote number left, branding (last page only)
            center, page X/Y right. The branding slot is a Text with a
            render prop because only Text gets `totalPages` from
            @react-pdf; View.render only exposes pageNumber. On
            non-last pages it returns an empty string so
            justifyContent="space-between" keeps the number and page
            indicator anchored to the page edges. We drop the
            previously-used <Link> wrapper — Text.render can't host
            arbitrary JSX cleanly, and "discreet" means giving up the
            clickable URL anyway. */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerLeft}>{quote.number}</Text>
          {showBranding ? (
            <Text
              style={
                isViralPlan
                  ? styles.footerBrandLinkStarter
                  : styles.footerBrandLink
              }
              render={({ pageNumber, totalPages }) =>
                pageNumber === totalPages
                  ? "Devis créé avec Quovi · quovi.fr"
                  : ""
              }
            />
          ) : (
            <Text> </Text>
          )}
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
