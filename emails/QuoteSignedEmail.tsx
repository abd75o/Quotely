import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface QuoteSignedEmailProps {
  company: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  signedAt: string;
  color?: string;
}

function formatEuros(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function QuoteSignedEmail({
  company,
  clientName,
  quoteNumber,
  total,
  signedAt,
  color = "#5B5BD6",
}: QuoteSignedEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Votre devis n°{quoteNumber} a bien été signé. Merci !
      </Preview>
      <Body
        style={{
          backgroundColor: "#F4F4F7",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif',
          margin: 0,
        }}
      >
        <Container
          style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px" }}
        >
          <Section
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: "32px 28px",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Heading
              style={{
                fontSize: 22,
                fontWeight: 700,
                color,
                margin: "0 0 16px",
              }}
            >
              Devis signé ✅
            </Heading>
            <Text
              style={{ fontSize: 15, lineHeight: 1.65, color: "#1F2937" }}
            >
              Bonjour {clientName},
            </Text>
            <Text
              style={{ fontSize: 15, lineHeight: 1.65, color: "#1F2937" }}
            >
              Vous venez de signer le devis n°{quoteNumber} d&apos;un
              montant de {formatEuros(total)} TTC. Merci pour votre
              confiance.
            </Text>
            <Text
              style={{ fontSize: 15, lineHeight: 1.65, color: "#1F2937" }}
            >
              Signé le {formatDate(signedAt)}. Une copie du devis signé est
              jointe à ce mail pour vos archives.
            </Text>
            <Hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "24px 0" }} />
            <Text style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
              Je reviens vers vous très vite pour la suite.
              <br />
              Cordialement,
              <br />
              {company}
            </Text>
          </Section>
          <Text
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              textAlign: "center",
              marginTop: 16,
              lineHeight: 1.5,
            }}
          >
            Vos données de signature sont conservées pendant 10 ans
            (obligation légale).
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
