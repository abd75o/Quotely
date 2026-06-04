import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  buildStyles,
  formatDate,
  formatEuros,
  companyDisplay,
  resolveAccent,
  formatSiret,
  formatRegistration,
  EmitterReceiver,
  LineItemsTable,
  BankBlock,
  type PdfProfile,
  type PdfClient,
  type PdfQuote,
  type QuoteLineRow,
} from "./quote-template";
import { resolveMentionsLegales, isVatSubject } from "./mentions-legales";
import { computeQuoteTotals, type QuoteItem } from "@/lib/quotes/items";
import { shouldShowBranding } from "@/lib/branding/should-show";
import type { InvoiceType } from "@/lib/invoices/create";

// ─── Public shape ────────────────────────────────────────────────────────────
// Une FACTURE clone visuellement le devis (mêmes police/styles/composants via
// les primitives exportées de quote-template). Différences : titre "FACTURE",
// numéro FAC-, date d'émission, réf. devis, libellé selon le type, et mentions
// légales facture (TVA, assurances, pénalités, délai de paiement).
//
// Les lignes affichées sont celles du DEVIS source ; les totaux sont calculés
// EXACTEMENT comme le devis (computeQuoteTotals), puis ventilés selon le type
// (acompte = part du total, solde = reste après acompte).
export interface InvoicePdfData {
  invoice_number: string;
  /** ISO date "YYYY-MM-DD". */
  issued_at: string;
  type: InvoiceType;
  /** % d'acompte (types 'acompte' et 'solde'). */
  acompte_percent?: number | null;
  /** Numéro du devis d'origine (réf. affichée), ex "QVI-2026-00007". */
  quote_number?: string | null;
  /** Lignes du devis source. */
  items: QuoteLineRow[];
}

const TYPE_LABEL: Record<InvoiceType, string> = {
  acompte: "Facture d'acompte",
  solde: "Facture de solde",
  totale: "Facture",
};

// Surcharges LOCALES à la facture (on ne modifie PAS buildStyles, partagé avec
// le devis). Empêchent libellé et montant de se chevaucher dans la carte des
// totaux : le libellé prend la largeur restante (flex + wrap), le montant ne se
// comprime jamais et reste collé à droite — quelle que soit la longueur du
// libellé ("Acompte à payer TTC", "Sous-total HT (acompte 30%)"…).
const ovr = StyleSheet.create({
  labelFlex: { flex: 1, paddingRight: 10 },
  valueRight: { flexShrink: 0, textAlign: "right" },
});

function toQuoteItem(line: QuoteLineRow): QuoteItem {
  return {
    id: line.id ?? "",
    label: line.label,
    quantity: Number(line.quantity || 0),
    unite: line.unite ?? null,
    price: Number(line.price || 0),
    tva: Number(line.tva ?? 0),
  };
}

// ─── Sous-bloc : bandeau type de facture + réf. devis ────────────────────────
function InvoiceTypeBanner(props: {
  styles: ReturnType<typeof buildStyles>;
  invoice: InvoicePdfData;
  fullTotalTtc: number;
  acompteTtc: number;
}) {
  const { styles, invoice, fullTotalTtc, acompteTtc } = props;
  const pct = Number(invoice.acompte_percent ?? 0);
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{TYPE_LABEL[invoice.type]}</Text>
      {invoice.quote_number && (
        <Text style={styles.sectionLine}>
          Réf. devis : {invoice.quote_number}
        </Text>
      )}
      {invoice.type === "acompte" && (
        <Text style={[styles.sectionLineMuted, { marginTop: 4 }]}>
          {`Acompte de ${pct}% sur le devis ${
            invoice.quote_number ? `${invoice.quote_number} ` : ""
          }d'un montant total de ${formatEuros(fullTotalTtc)} TTC.`}
        </Text>
      )}
      {invoice.type === "solde" && (
        <Text style={[styles.sectionLineMuted, { marginTop: 4 }]}>
          {`Solde après acompte de ${pct}% (${formatEuros(
            acompteTtc,
          )} TTC déjà versé) sur le devis d'un montant total de ${formatEuros(
            fullTotalTtc,
          )} TTC.`}
        </Text>
      )}
    </View>
  );
}

// ─── Sous-bloc : totaux facture (ventile la TVA par taux, comme le devis) ────
function InvoiceTotalsBlock(props: {
  styles: ReturnType<typeof buildStyles>;
  invoice: InvoicePdfData;
  totals: ReturnType<typeof computeQuoteTotals>;
}) {
  const { styles, invoice, totals } = props;

  // factor = part du devis facturée par CE document.
  //   acompte X% → X% ; solde → (100 − X)% ; totale → 100%.
  const pct = Number(invoice.acompte_percent ?? 0);
  const factor =
    invoice.type === "acompte"
      ? pct / 100
      : invoice.type === "solde"
        ? (100 - pct) / 100
        : 1;

  const rates = Object.entries(totals.taxBreakdown)
    .map(([rate, b]) => ({ rate: Number(rate), base: b.base, tax: b.tax }))
    .sort((a, b) => a.rate - b.rate);
  const hasMultiTva = rates.length > 1;

  const billedHT = +(totals.subtotal * factor).toFixed(2);
  const billedTVA = +(totals.taxAmount * factor).toFixed(2);
  const billedTTC = +(totals.total * factor).toFixed(2);

  const grandLabel =
    invoice.type === "solde"
      ? "Reste dû TTC"
      : invoice.type === "acompte"
        ? "Acompte à payer TTC"
        : "Total TTC";

  return (
    <View style={styles.totalsWrap}>
      <View style={styles.totalsBox}>
        {/* Contexte acompte/solde : rappel du total du devis. */}
        {invoice.type !== "totale" && (
          <View style={styles.totalLine}>
            <Text style={[styles.totalLabel, ovr.labelFlex]}>
              Total du devis TTC
            </Text>
            <Text style={[styles.totalValue, ovr.valueRight]}>
              {formatEuros(totals.total)}
            </Text>
          </View>
        )}

        <View style={styles.totalLine}>
          <Text style={[styles.totalLabel, ovr.labelFlex]}>
            {invoice.type === "totale"
              ? "Sous-total HT"
              : `Sous-total HT (${invoice.type === "acompte" ? `acompte ${pct}%` : "solde"})`}
          </Text>
          <Text style={[styles.totalValue, ovr.valueRight]}>
            {formatEuros(billedHT)}
          </Text>
        </View>

        {hasMultiTva
          ? rates.map((r) => (
              <View key={r.rate} style={styles.totalLine}>
                <Text style={[styles.totalLabel, ovr.labelFlex]}>
                  TVA {r.rate}% (sur {formatEuros(r.base * factor)})
                </Text>
                <Text style={[styles.totalValue, ovr.valueRight]}>
                  {formatEuros(r.tax * factor)}
                </Text>
              </View>
            ))
          : (() => {
              const only = rates[0];
              const rate = only ? only.rate : totals.taxRate;
              return (
                <View style={styles.totalLine}>
                  <Text style={[styles.totalLabel, ovr.labelFlex]}>
                    TVA {rate}%
                  </Text>
                  <Text style={[styles.totalValue, ovr.valueRight]}>
                    {formatEuros(billedTVA)}
                  </Text>
                </View>
              );
            })()}

        <View style={styles.totalDivider} />

        <View style={styles.grandTotalRow}>
          <Text style={[styles.grandTotalLabel, ovr.labelFlex]}>
            {grandLabel}
          </Text>
          <Text style={[styles.grandTotalValue, ovr.valueRight]}>
            {formatEuros(billedTTC)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Sous-bloc : mentions légales facture ────────────────────────────────────
function InvoiceLegalMentions(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  companyName: string;
  issuedAt: string;
  mentions: ReturnType<typeof resolveMentionsLegales>;
}) {
  const { styles, profile, companyName, issuedAt, mentions } = props;

  // Délai de paiement : 30 jours à compter de l'émission (défaut légal B2B).
  const dueDate = (() => {
    try {
      const d = new Date(issuedAt);
      d.setDate(d.getDate() + 30);
      return formatDate(d.toISOString());
    } catch {
      return null;
    }
  })();

  // Ligne TVA : franchise → mention 293 B ; assujetti → "Assujetti TVA" (+ n°).
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
        {formatRegistration(profile) ? ` — ${formatRegistration(profile)}` : ""}
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
      {tvaMentionLine && <Text style={styles.mentionLine}>{tvaMentionLine}</Text>}
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
      <Text style={styles.mentionBullet}>
        {`• Paiement à 30 jours${dueDate ? ` (au plus tard le ${dueDate})` : ""}.`}
      </Text>
      <Text style={styles.mentionBullet}>
        {"• En cas de retard de paiement : pénalités au taux de 3 fois le taux d'intérêt légal en vigueur, et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce)."}
      </Text>
    </View>
  );
}

// ─── En-tête facture ─────────────────────────────────────────────────────────
function InvoiceHeader(props: {
  styles: ReturnType<typeof buildStyles>;
  profile: PdfProfile;
  invoice: InvoicePdfData;
  accent: string;
  companyName: string;
}) {
  const { styles, profile, invoice, accent, companyName } = props;
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          {profile.logo_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={profile.logo_url} style={styles.headerLogo} />
          ) : (
            <Text style={styles.headerCompanyText}>{companyName}</Text>
          )}
        </View>
        <View style={styles.headerMeta}>
          <Text style={[styles.documentTitle, { color: accent }]}>FACTURE</Text>
          <View style={styles.documentNumberBadge}>
            <Text style={styles.documentNumberText}>
              N° {invoice.invoice_number}
            </Text>
          </View>
          <Text style={styles.documentDate}>
            Émise le {formatDate(invoice.issued_at)}
            {invoice.quote_number ? `\nRéf. devis ${invoice.quote_number}` : ""}
          </Text>
        </View>
      </View>
      <View style={styles.headerDivider} />
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────
export function InvoicePdfDocument({
  invoice,
  profile,
  client,
}: {
  invoice: InvoicePdfData;
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
  const isViralPlan = profile.plan === "free" || profile.plan === "starter";

  // Totaux du DEVIS, calculés exactement comme côté devis.
  const totals = computeQuoteTotals(invoice.items.map(toQuoteItem));
  const pct = Number(invoice.acompte_percent ?? 0);
  const acompteTtc = +(totals.total * (pct / 100)).toFixed(2);

  // Objet PdfQuote minimal pour réutiliser LineItemsTable (lit items + tax_rate).
  const tableQuote: PdfQuote = {
    number: invoice.invoice_number,
    status: "invoiced",
    created_at: invoice.issued_at,
    valid_until: null,
    items: invoice.items,
    subtotal: totals.subtotal,
    tax_rate: totals.taxRate,
    tax_amount: totals.taxAmount,
    total: totals.total,
  };

  return (
    <Document
      title={`Facture ${invoice.invoice_number} - ${companyName}`}
      author={companyName}
      creator={companyName}
      producer={companyName}
    >
      <Page size="A4" style={styles.page}>
        <InvoiceHeader
          styles={styles}
          profile={profile}
          invoice={invoice}
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

        <LineItemsTable styles={styles} quote={tableQuote} />

        {/* Bloc récap insécable : carte des totaux + grand total + bandeau type
            + coordonnées bancaires + mentions légales restent groupés et ne
            sont JAMAIS coupés par un saut de page (wrap={false}). S'ils ne
            tiennent pas sur la page en cours, l'ensemble descend d'un bloc. */}
        <View wrap={false}>
          <InvoiceTotalsBlock styles={styles} invoice={invoice} totals={totals} />

          <InvoiceTypeBanner
            styles={styles}
            invoice={invoice}
            fullTotalTtc={totals.total}
            acompteTtc={acompteTtc}
          />

          <BankBlock styles={styles} profile={profile} companyName={companyName} />

          <InvoiceLegalMentions
            styles={styles}
            profile={profile}
            companyName={companyName}
            issuedAt={invoice.issued_at}
            mentions={mentions}
          />
        </View>

        {/* Footer identique au devis (numéro à gauche, branding centre dernière
            page, pagination à droite). */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerLeft}>{invoice.invoice_number}</Text>
          {showBranding ? (
            <Text
              style={
                isViralPlan
                  ? styles.footerBrandLinkStarter
                  : styles.footerBrandLink
              }
              render={({ pageNumber, totalPages }) =>
                pageNumber === totalPages ? "Facture créée avec Quovi · quovi.fr" : ""
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
