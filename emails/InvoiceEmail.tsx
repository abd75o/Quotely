import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type InvoiceEmailType = "acompte" | "solde" | "totale";

interface InvoiceEmailProps {
  company: string;
  clientName: string;
  invoiceNumber: string;
  type: InvoiceEmailType;
  acomptePercent?: number | null;
  totalTtc: number;
  color: string;
  logoUrl?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  email?: string | null;
  telephone?: string | null;
  showBranding?: boolean;
}

const DEFAULT_COLOR = "#5B5BD6";

function formatEuros(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function docLabel(type: InvoiceEmailType, acomptePercent?: number | null): string {
  if (type === "acompte") {
    return acomptePercent
      ? `facture d'acompte n°{N} (${acomptePercent}%)`
      : "facture d'acompte n°{N}";
  }
  if (type === "solde") return "facture de solde n°{N}";
  return "facture n°{N}";
}

export default function InvoiceEmail({
  company,
  clientName,
  invoiceNumber,
  type,
  acomptePercent,
  totalTtc,
  color = DEFAULT_COLOR,
  logoUrl,
  address,
  postalCode,
  city,
  email,
  telephone,
  showBranding = false,
}: InvoiceEmailProps) {
  const label = docLabel(type, acomptePercent).replace("{N}", invoiceNumber);
  const previewText = `${company} vous a envoyé une ${label} de ${formatEuros(
    totalTtc,
  )}.`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt={company}
                width="120"
                style={{ maxHeight: 80, objectFit: "contain" }}
              />
            ) : (
              <Heading style={{ ...companyName, color }}>{company}</Heading>
            )}
          </Section>

          <Section style={contentBox}>
            <Text style={greeting}>Bonjour {clientName},</Text>

            <Text style={paragraph}>
              Veuillez trouver ci-joint votre {label}, d&apos;un montant de{" "}
              {formatEuros(totalTtc)} TTC, au format PDF.
            </Text>

            <Text style={paragraph}>
              Si vous avez la moindre question, répondez simplement à ce mail,
              je vous réponds rapidement.
            </Text>

            <Text style={signoff}>
              Cordialement,
              <br />
              {company}
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerStrong}>{company}</Text>
            {address && <Text style={footerLine}>{address}</Text>}
            {(postalCode || city) && (
              <Text style={footerLine}>
                {[postalCode, city].filter(Boolean).join(" ")}
              </Text>
            )}
            {email && <Text style={footerLine}>{email}</Text>}
            {telephone && <Text style={footerLine}>{telephone}</Text>}
            <Text style={footerMuted}>
              Document généré électroniquement. Ce mail contient la facture en
              pièce jointe au format PDF.
            </Text>
            {showBranding && (
              <Text style={brandingFooter}>
                Envoyé via{" "}
                <a href="https://quovi.fr" style={brandingLink}>
                  Quovi
                </a>{" "}
                · Devis &amp; factures BTP en 2 minutes
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#F4F4F7",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
};
const container: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "32px 16px",
};
const header: React.CSSProperties = { textAlign: "center", padding: "16px 0" };
const companyName: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  margin: 0,
  letterSpacing: -0.3,
};
const contentBox: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: "32px 28px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
};
const greeting: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: "#0F172A",
  margin: "0 0 12px",
};
const paragraph: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.65,
  color: "#1F2937",
  margin: "0 0 16px",
};
const signoff: React.CSSProperties = {
  fontSize: 14,
  color: "#374151",
  margin: "20px 0 0",
  lineHeight: 1.6,
};
const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #E5E7EB",
  margin: "28px 0 16px",
};
const footer: React.CSSProperties = { textAlign: "center" };
const footerStrong: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#1F2937",
  margin: "0 0 4px",
};
const footerLine: React.CSSProperties = {
  fontSize: 12,
  color: "#6B7280",
  margin: "0 0 2px",
};
const footerMuted: React.CSSProperties = {
  fontSize: 11,
  color: "#9CA3AF",
  marginTop: 12,
  lineHeight: 1.5,
};
const brandingFooter: React.CSSProperties = {
  color: "#9CA3AF",
  fontSize: 12,
  marginTop: 24,
  textAlign: "center",
};
const brandingLink: React.CSSProperties = {
  color: "#9CA3AF",
  textDecoration: "underline",
};
