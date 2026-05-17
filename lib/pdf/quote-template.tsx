import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { resolveMentionsLegales } from "./mentions-legales";
import { shouldShowBranding } from "@/lib/branding/should-show";

// ─── Design system ─────────────────────────────────────────────────────────
// Apple-receipt aesthetic: a neutral slate palette with a single artisan-
// supplied accent. Every literal in the template references these tokens, so
// re-skinning the PDF is a one-line change here.
//
// react-pdf does NOT support CSS variables, so we resolve the accent at the
// top of QuotePdfDocument and pass it into buildStyles().
const palette = {
  textPrimary: "#0F172A",   // slate-900
  textSecondary: "#475569", // slate-600
  textTertiary: "#94A3B8",  // slate-400  (labels)
  hairline: "#E2E8F0",      // slate-200  (separators)
  zebra: "#F8FAFC",         // slate-50   (alt rows)
  white: "#FFFFFF",
  statusPending: "#F59E0B", // amber-500
  statusRefused: "#DC2626", // red-600
  statusDraft: "#94A3B8",   // slate-400
} as const;

const DEFAULT_ACCENT = "#0F172A"; // slate-900 — never reads bad on white.
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// Tail-spaced typography tokens. PT-based because react-pdf measures in pt.
const fonts = {
  // No external font registration — we stick to Helvetica/Helvetica-Bold,
  // which react-pdf bundles. Switching to Inter would require shipping TTFs
  // and a Font.register call; the spec lists it as optional with Helvetica
  // as an acceptable fallback, so we keep deploy size lean.
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique",
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
  /** Canonical brand accent — added in 20260518_brand_color. */
  brand_color?: string | null;
  /** Legacy aliases kept as PDF-side fallback while back-fill runs. */
  couleur_principale?: string | null;
  primary_color?: string | null;
  rc_pro_number?: string | null;
  rc_pro_company?: string | null;
  decennale_number?: string | null;
  decennale_company?: string | null;
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
}

// ─── Formatters ────────────────────────────────────────────────────────────
function formatDate(iso: string | null | undefined): string {
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
 * grouping with ASCII spaces and append the € manually.
 */
function formatEuros(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = n < 0 ? "-" : "";
  return `${sign}${grouped},${decPart}  €`;
}

function titleCase(input: string): string {
  return input
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (/^[A-Z0-9.&]+$/.test(part) && part.length <= 5) return part;
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function companyDisplay(p: PdfProfile): string {
  const raw =
    p.company_name ||
    p.company ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.email ||
    "Prestataire";
  return titleCase(raw);
}

function clientDisplay(c: PdfClient): string {
  const full = c.first_name ? `${c.first_name} ${c.name}` : c.name;
  return titleCase(full);
}

function formatSiret(siret: string | null | undefined): string | null {
  if (!siret) return null;
  const digits = siret.replace(/\s+/g, "");
  if (!/^\d{14}$/.test(digits)) return siret;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
}

function formatIban(iban: string | null | undefined): string | null {
  if (!iban) return null;
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return compact;
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

function resolveAccent(p: PdfProfile): string {
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

/**
 * Map a quote status to the pill rendered top-right of the header. Signed
 * statuses adopt the artisan accent — everything else uses neutral signal
 * colours so the eye still parses "this isn't final".
 */
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

interface PaymentStage {
  label: string;
  percent: number;
  amount: number;
}

function paymentSchedule(total: number, acomptePercent?: number | null): PaymentStage[] {
  const deposit = Number.isFinite(acomptePercent ?? NaN) ? Number(acomptePercent) : 30;
  const remaining = 100 - deposit;
  const mid = Math.round((remaining * 4) / 7);
  const last = 100 - deposit - mid;
  const at = (p: number) => +(total * (p / 100)).toFixed(2);
  return [
    { label: "Acompte à la signature", percent: deposit, amount: at(deposit) },
    { label: "Au démarrage des travaux", percent: mid, amount: at(mid) },
    { label: "Solde à la réception", percent: last, amount: at(last) },
  ];
}

// ─── StyleSheet ────────────────────────────────────────────────────────────
function buildStyles(accent: string) {
  return StyleSheet.create({
    // Per-spec 48pt margins all round. paddingBottom is bumped so the fixed
    // page footer never collides with content.
    page: {
      paddingTop: 48,
      paddingBottom: 64,
      paddingHorizontal: 48,
      fontSize: 11,
      fontFamily: fonts.regular,
      color: palette.textPrimary,
      lineHeight: 1.5,
    },

    // ── Header ─────────────────────────────────────────────────────────
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerBrand: {
      maxWidth: "55%",
    },
    headerLogo: {
      height: 48,
      maxWidth: 200,
      objectFit: "contain",
    },
    headerCompanyText: {
      fontSize: 24,
      fontFamily: fonts.bold,
      color: palette.textPrimary,
      letterSpacing: -0.3,
    },
    headerMeta: {
      alignItems: "flex-end",
    },
    documentKicker: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.textTertiary,
      letterSpacing: 2,
    },
    documentNumber: {
      fontSize: 24,
      fontFamily: fonts.bold,
      color: palette.textPrimary,
      marginTop: 4,
      letterSpacing: -0.4,
    },
    documentDates: {
      marginTop: 8,
      fontSize: 10,
      color: palette.textSecondary,
      textAlign: "right",
    },
    statusPill: {
      marginTop: 12,
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 999,
      // Set per render via inline merge — value here is just a placeholder.
      backgroundColor: accent,
    },
    statusPillText: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.white,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    headerDivider: {
      borderBottomWidth: 1,
      borderBottomColor: palette.hairline,
      marginTop: 20,
      marginBottom: 24,
    },

    // ── Parties ────────────────────────────────────────────────────────
    parties: {
      flexDirection: "row",
      gap: 32,
      marginBottom: 28,
    },
    party: {
      flex: 1,
    },
    partyLabel: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.textTertiary,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    partyName: {
      fontSize: 14,
      fontFamily: fonts.bold,
      color: palette.textPrimary,
      marginBottom: 6,
    },
    partyLine: {
      fontSize: 11,
      color: palette.textSecondary,
      lineHeight: 1.6,
    },
    partyMutedNote: {
      fontSize: 9,
      color: palette.textTertiary,
      marginTop: 4,
      lineHeight: 1.4,
    },

    // ── Items table ────────────────────────────────────────────────────
    table: {
      marginBottom: 16,
    },
    tableHead: {
      flexDirection: "row",
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.hairline,
    },
    th: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.textTertiary,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 10,
    },
    tableRowZebra: {
      backgroundColor: palette.zebra,
    },
    cellDesc: { flex: 1, color: palette.textPrimary, fontSize: 11, paddingRight: 8 },
    cellQty: { width: 50, textAlign: "center", color: palette.textSecondary, fontSize: 11 },
    cellUnit: { width: 60, textAlign: "center", color: palette.textSecondary, fontSize: 11 },
    cellPu: { width: 70, textAlign: "right", color: palette.textSecondary, fontSize: 11 },
    cellTva: { width: 50, textAlign: "center", color: palette.textSecondary, fontSize: 11 },
    cellTotal: {
      width: 80,
      textAlign: "right",
      color: palette.textPrimary,
      fontSize: 11,
      fontFamily: fonts.bold,
    },

    // ── Totals ─────────────────────────────────────────────────────────
    totalsWrap: {
      marginTop: 20,
      alignItems: "flex-end",
    },
    totalsBox: {
      width: 280,
    },
    totalLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    totalLabel: {
      fontSize: 11,
      color: palette.textSecondary,
    },
    totalValue: {
      fontSize: 11,
      color: palette.textPrimary,
      fontFamily: fonts.bold,
    },
    totalDivider: {
      borderTopWidth: 1,
      borderTopColor: palette.hairline,
      marginTop: 4,
      marginBottom: 10,
    },
    grandTotalLabel: {
      fontSize: 10,
      fontFamily: fonts.bold,
      color: palette.textTertiary,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    grandTotalValue: {
      fontSize: 22,
      fontFamily: fonts.bold,
      color: accent,
      marginTop: 4,
      letterSpacing: -0.4,
    },

    // ── Section blocks (Échéancier / Validité / Bank / Notes) ──────────
    section: {
      marginTop: 28,
    },
    sectionTitleRow: {
      borderBottomWidth: 1,
      borderBottomColor: palette.hairline,
      paddingBottom: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 9,
      fontFamily: fonts.bold,
      color: palette.textTertiary,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    sectionLine: {
      fontSize: 11,
      color: palette.textPrimary,
      lineHeight: 1.6,
    },
    sectionLineMuted: {
      fontSize: 10,
      color: palette.textSecondary,
      lineHeight: 1.55,
      marginTop: 6,
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    paymentLabel: { fontSize: 11, color: palette.textPrimary },
    paymentAmount: {
      fontSize: 11,
      color: palette.textPrimary,
      fontFamily: fonts.bold,
    },

    // ── Signature ──────────────────────────────────────────────────────
    signature: {
      marginTop: 28,
    },
    signatureHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.hairline,
      marginBottom: 12,
    },
    signatureTitle: {
      fontSize: 9,
      fontFamily: fonts.bold,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: accent,
    },
    signatureBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    signatureDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: accent,
    },
    signatureDate: {
      fontSize: 11,
      color: palette.textPrimary,
    },
    signatureName: {
      fontSize: 13,
      fontFamily: fonts.bold,
      color: palette.textPrimary,
      marginBottom: 4,
    },
    signatureRef: {
      fontSize: 10,
      color: palette.textTertiary,
      marginTop: 10,
    },
    signatureUnsigned: {
      marginTop: 28,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: palette.hairline,
      borderRadius: 8,
      padding: 20,
    },
    signatureUnsignedTitle: {
      fontSize: 9,
      fontFamily: fonts.bold,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      color: palette.textTertiary,
      marginBottom: 8,
    },
    signatureUnsignedHint: {
      fontSize: 10,
      color: palette.textTertiary,
      fontFamily: fonts.italic,
      marginBottom: 32,
    },
    signatureUnsignedLine: {
      fontSize: 11,
      color: palette.textSecondary,
      lineHeight: 1.6,
    },

    // ── Legal mentions (always last section of content) ────────────────
    mentions: {
      marginTop: 32,
    },
    mentionLine: {
      fontSize: 9,
      color: palette.textSecondary,
      lineHeight: 1.5,
    },
    mentionBullet: {
      fontSize: 9,
      color: palette.textSecondary,
      lineHeight: 1.5,
      marginTop: 2,
    },

    // ── Slim fixed footer (number + page number only) ──────────────────
    pageFooter: {
      position: "absolute",
      bottom: 24,
      left: 48,
      right: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    pageFooterText: {
      fontSize: 8,
      color: palette.textTertiary,
      letterSpacing: 0.4,
    },

    // ── Branding footer (last page only) ───────────────────────────────
    brandingFooter: {
      marginTop: 24,
      fontSize: 8,
      fontFamily: fonts.italic,
      color: palette.textTertiary,
      textAlign: "center",
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
          <Text style={styles.documentKicker}>DEVIS</Text>
          <Text style={styles.documentNumber}>N° {quote.number}</Text>
          <Text style={styles.documentDates}>
            Émis le {formatDate(quote.created_at)}
            {"\n"}
            {quote.valid_until
              ? `Valable jusqu'au ${formatDate(quote.valid_until)}`
              : "Validité 90 jours"}
          </Text>
          <View
            style={[styles.statusPill, { backgroundColor: status.bg }]}
          >
            <Text style={styles.statusPillText}>{status.label}</Text>
          </View>
        </View>
      </View>
      <View style={styles.headerDivider} />
    </View>
  );
}

function EmitterReceiver(props: {
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
            {titleCase(client.company_name)}
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
            {client.telephone ?? client.phone}
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

function LineItemsTable(props: {
  styles: ReturnType<typeof buildStyles>;
  quote: PdfQuote;
}) {
  const { styles, quote } = props;
  return (
    <View style={styles.table}>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.cellDesc]}>Description</Text>
        <Text style={[styles.th, styles.cellQty]}>Qté</Text>
        <Text style={[styles.th, styles.cellUnit]}>Unité</Text>
        <Text style={[styles.th, styles.cellPu]}>PU HT</Text>
        <Text style={[styles.th, styles.cellTva]}>TVA</Text>
        <Text style={[styles.th, styles.cellTotal]}>Total HT</Text>
      </View>
      {quote.items.map((line, idx) => {
        const qty = Number(line.quantity || 1);
        const ht = Number(line.price) * qty;
        const zebra = idx % 2 === 1;
        return (
          <View
            key={line.id ?? idx}
            style={[styles.tableRow, zebra ? styles.tableRowZebra : null].filter(Boolean) as Style[]}
          >
            <Text style={styles.cellDesc}>{line.label}</Text>
            <Text style={styles.cellQty}>{qty}</Text>
            <Text style={styles.cellUnit}>{line.unite ?? "—"}</Text>
            <Text style={styles.cellPu}>{formatEuros(line.price)}</Text>
            <Text style={styles.cellTva}>
              {Number(line.tva ?? quote.tax_rate)} %
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
          ? Array.from(grouped.entries()).map(([rate, b]) => (
              <View key={rate} style={styles.totalLine}>
                <Text style={styles.totalLabel}>
                  TVA {rate} % sur {formatEuros(b.base)}
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
                  <Text style={styles.totalLabel}>TVA {rate} %</Text>
                  <Text style={styles.totalValue}>{formatEuros(tax)}</Text>
                </View>
              );
            })()}

        <View style={styles.totalDivider} />

        <View>
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
  const schedule = paymentSchedule(quote.total, quote.acompte_percent);
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Échéancier</Text>
      </View>
      {quote.payment_terms ? (
        quote.payment_terms
          .split(/\r?\n/)
          .filter((l) => l.trim())
          .map((line, i) => (
            <Text key={i} style={styles.sectionLine}>
              {line}
            </Text>
          ))
      ) : (
        <>
          {schedule.map((stage) => (
            <View key={stage.label} style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                {stage.label} ({stage.percent} %)
              </Text>
              <Text style={styles.paymentAmount}>
                {formatEuros(stage.amount)}
              </Text>
            </View>
          ))}
          <Text style={styles.sectionLineMuted}>
            Délai de paiement : 30 jours à compter de la facturation, sauf
            mention contraire.
          </Text>
        </>
      )}
    </View>
  );
}

function ValidityBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  quote: PdfQuote;
  hasDecennale: boolean;
}) {
  const { styles, quote, hasDecennale } = props;
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Validité</Text>
      </View>
      <Text style={styles.sectionLine}>
        {quote.valid_until
          ? `Jusqu'au ${formatDate(quote.valid_until)}`
          : "90 jours à compter de l'émission"}
      </Text>
      <Text style={styles.sectionLineMuted}>
        Délai d'intervention : à confirmer après signature du devis.
        {hasDecennale ? " Garantie décennale incluse." : ""}
      </Text>
      {quote.notes ? (
        <Text style={[styles.sectionLineMuted, { marginTop: 8 }]}>
          {quote.notes}
        </Text>
      ) : null}
    </View>
  );
}

function BankBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  companyName: string;
}) {
  const { styles, profile, companyName } = props;
  if (!profile.iban && !profile.bic) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>
          Coordonnées bancaires (règlement par virement)
        </Text>
      </View>
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
  quote: PdfQuote;
}) {
  const { styles, quote } = props;
  const sig = quote.signature_data ?? null;
  const signedAt =
    quote.signed_at ?? (sig && typeof sig === "object" && (sig.signed_at as string)) ?? null;
  const signedBy =
    quote.signed_by ??
    (sig && typeof sig === "object" && ((sig.name as string) || (sig.signer as string))) ??
    null;
  const signatureImage =
    sig && typeof sig === "object" && (sig.signature_image_url as string)
      ? (sig.signature_image_url as string)
      : null;

  const showSigned = isSignedStatus(quote.status) && (signedAt || signedBy);

  if (showSigned) {
    return (
      <View style={styles.signature}>
        <View style={styles.signatureHeadRow}>
          <Text style={styles.signatureTitle}>
            Signature électronique validée
          </Text>
        </View>
        {signedBy && <Text style={styles.signatureName}>{signedBy}</Text>}
        {signedAt && (
          <View style={styles.signatureBody}>
            <View style={styles.signatureDot} />
            <Text style={styles.signatureDate}>
              Le {formatDateTimeFr(signedAt)}
            </Text>
          </View>
        )}
        {signatureImage && (
          <Image
            src={signatureImage}
            style={{ width: 180, height: 60, marginTop: 10 }}
          />
        )}
        <Text style={styles.signatureRef}>
          Référence : {quote.number}
          {quote.signature_token
            ? ` · Token ••••${quote.signature_token.slice(-4).toUpperCase()}`
            : ""}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.signatureUnsigned}>
      <Text style={styles.signatureUnsignedTitle}>Bon pour accord</Text>
      <Text style={styles.signatureUnsignedHint}>
        Date et signature précédées de la mention « Bon pour travaux »
      </Text>
      <Text style={styles.signatureUnsignedLine}>
        Date : ______________________
      </Text>
      <Text style={[styles.signatureUnsignedLine, { marginTop: 8 }]}>
        Signature :
      </Text>
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
  return (
    <View style={styles.mentions} wrap={false}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Mentions légales</Text>
      </View>
      <Text style={styles.mentionLine}>
        {companyName}
        {profile.legal_status ? ` — ${profile.legal_status}` : ""}
        {profile.siret ? ` — SIRET ${formatSiret(profile.siret)}` : ""}
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
      <Text style={styles.mentionLine}>
        {mentions.tvaNote
          ? mentions.tvaNote
          : profile.vat_number
            ? `Assujetti TVA — n° ${profile.vat_number}`
            : "Assujetti TVA"}
      </Text>
      {profile.decennale_number && (
        <Text style={styles.mentionLine}>
          Garantie décennale :{" "}
          {profile.decennale_company
            ? `${profile.decennale_company} n°${profile.decennale_number}`
            : profile.decennale_number}
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
        .map((m, i) => (
          <Text key={i} style={styles.mentionBullet}>
            • {m}
          </Text>
        ))}
    </View>
  );
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

        <ValidityBlock
          styles={styles}
          quote={quote}
          hasDecennale={Boolean(profile.decennale_number)}
        />

        <BankBlock styles={styles} profile={profile} companyName={companyName} />

        <SignatureBlock styles={styles} quote={quote} />

        <LegalMentions
          styles={styles}
          profile={profile}
          companyName={companyName}
          mentions={mentions}
        />

        {showBranding && (
          <Text style={styles.brandingFooter}>
            Devis créé avec Quovi · quovi.fr
          </Text>
        )}

        {/* Page footer — ONLY the quote number + pagination. The previous
            "Devis X · Company · Généré avec Quovi" trio was pollution and
            is intentionally gone. */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.pageFooterText}>{quote.number}</Text>
          <Text
            style={styles.pageFooterText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
