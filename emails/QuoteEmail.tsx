import {
  Body,
  Button,
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
import {
  formatCompanyName,
  formatFirstName,
  formatFullName,
} from "@/lib/text/name-normalize";

export interface QuoteEmailProfile {
  company_name?: string | null;
  company?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  telephone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  logo_url?: string | null;
  couleur_principale?: string | null;
}

export interface QuoteEmailClient {
  name: string;
  first_name?: string | null;
  email?: string | null;
}

export interface QuoteEmailQuote {
  number: string;
  total: number;
  valid_until?: string | null;
}

interface QuoteEmailProps {
  quote: QuoteEmailQuote;
  profile: QuoteEmailProfile;
  client: QuoteEmailClient;
  signLink: string;
  customMessage?: string;
  /** When true, append the discreet "Envoyé via Quovi" mention under the
   *  signature. Computed by lib/branding/should-show.ts upstream. */
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

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function companyDisplay(p: QuoteEmailProfile): string {
  const company = (p.company_name || p.company || "").trim();
  if (company) return formatCompanyName(company);
  const person = formatFullName(p.first_name, p.last_name);
  return person || "Votre prestataire";
}

export default function QuoteEmail({
  quote,
  profile,
  client,
  signLink,
  customMessage,
  showBranding = false,
}: QuoteEmailProps) {
  const color = profile.couleur_principale || DEFAULT_COLOR;
  const company = companyDisplay(profile);
  const clientName = client.first_name
    ? formatFirstName(client.first_name)
    : formatCompanyName(client.name);
  const validUntil = formatDate(quote.valid_until);

  const previewText = `${company} vous a envoyé un devis de ${formatEuros(quote.total)}.`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            {profile.logo_url ? (
              <Img
                src={profile.logo_url}
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
              {customMessage ||
                `Voici le devis n°${quote.number} que vous m'avez demandé, d'un montant de ${formatEuros(quote.total)} TTC. Vous pouvez le consulter, le télécharger et le signer directement en ligne en cliquant sur le bouton ci-dessous.`}
            </Text>

            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href={signLink}
                style={{
                  ...button,
                  backgroundColor: color,
                }}
              >
                Voir et signer le devis →
              </Button>
            </Section>

            {validUntil && (
              <Text style={subtle}>
                Devis valable jusqu&apos;au {validUntil}.
              </Text>
            )}

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
            {profile.address && <Text style={footerLine}>{profile.address}</Text>}
            {(profile.postal_code || profile.city) && (
              <Text style={footerLine}>
                {[profile.postal_code, profile.city]
                  .filter(Boolean)
                  .join(" ")}
              </Text>
            )}
            {profile.email && (
              <Text style={footerLine}>{profile.email}</Text>
            )}
            {profile.telephone && (
              <Text style={footerLine}>{profile.telephone}</Text>
            )}
            <Text style={footerMuted}>
              Document généré électroniquement. Ce mail contient le devis en
              pièce jointe au format PDF.
            </Text>
            {showBranding && (
              <Text style={brandingFooter}>
                Envoyé via{" "}
                <a href="https://quovi.fr" style={brandingLink}>
                  Quovi
                </a>{" "}
                · Devis BTP en 2 minutes
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

const header: React.CSSProperties = {
  textAlign: "center",
  padding: "16px 0",
};

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

const button: React.CSSProperties = {
  display: "inline-block",
  color: "#FFFFFF",
  textDecoration: "none",
  padding: "14px 32px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: 0.2,
};

const subtle: React.CSSProperties = {
  fontSize: 13,
  color: "#6B7280",
  margin: "0 0 16px",
  textAlign: "center",
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

const footer: React.CSSProperties = {
  textAlign: "center",
};

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
