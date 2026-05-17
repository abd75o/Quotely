import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ArtisanSignedNotificationProps {
  artisanName: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  dashboardUrl: string;
}

function formatEuros(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

export default function ArtisanSignedNotification({
  artisanName,
  clientName,
  quoteNumber,
  total,
  dashboardUrl,
}: ArtisanSignedNotificationProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        {clientName} a signé votre devis n°{quoteNumber}
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
          style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}
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
                color: "#5B5BD6",
                margin: "0 0 12px",
              }}
            >
              Devis signé 🎉
            </Heading>
            <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 1.6 }}>
              Salut {artisanName},
            </Text>
            <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 1.6 }}>
              <strong>{clientName}</strong> vient de signer ton devis{" "}
              <strong>n°{quoteNumber}</strong> d&apos;un montant de{" "}
              <strong>{formatEuros(total)}</strong>.
            </Text>
            <Section style={{ textAlign: "center", margin: "28px 0 0" }}>
              <Button
                href={dashboardUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: "#5B5BD6",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  padding: "12px 28px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Voir le devis signé →
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
