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

// Email de RELANCE Iris — rédigé à la 1ʳᵉ personne, comme si l'artisan l'écrivait
// lui-même. Quovi reste TOTALEMENT invisible (aucun footer, aucun logo, aucune
// mention) : From = nom de l'artisan, reply-to = email de l'artisan, contact
// présenté comme le sien. CHAQUE relance se termine par le lien de signature.
export type ReminderStage = "j3" | "j7" | "j14";
export type ReminderContext = "viewed" | "not_viewed";

export interface ReminderEmailProfile {
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

export interface ReminderEmailClient {
  name: string;
  first_name?: string | null;
}

export interface ReminderEmailQuote {
  number: string;
  total: number;
}

interface ReminderEmailProps {
  quote: ReminderEmailQuote;
  profile: ReminderEmailProfile;
  client: ReminderEmailClient;
  signLink: string;
  stage: ReminderStage;
  /** Le client a-t-il ouvert la page de signature (page_viewed_at) ? */
  context: ReminderContext;
}

const DEFAULT_COLOR = "#5B5BD6";

function formatEuros(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function companyDisplay(p: ReminderEmailProfile): string {
  const company = (p.company_name || p.company || "").trim();
  if (company) return formatCompanyName(company);
  const person = formatFullName(p.first_name, p.last_name);
  return person || "Votre prestataire";
}

// Phrase de contact à la 1ʳᵉ personne, n'affichant que les canaux renseignés.
function contactSentence(p: ReminderEmailProfile): string {
  const bits: string[] = [];
  if (p.telephone) bits.push(`au ${p.telephone}`);
  if (p.email) bits.push(`par email à ${p.email}`);
  if (bits.length === 0) {
    return "n'hésitez pas à me contacter en répondant directement à ce mail";
  }
  return `n'hésitez pas à me contacter ${bits.join(" ou ")}`;
}

export default function ReminderEmail({
  quote,
  profile,
  client,
  signLink,
  stage,
  context,
}: ReminderEmailProps) {
  const color = profile.couleur_principale || DEFAULT_COLOR;
  const company = companyDisplay(profile);
  const clientName = client.first_name
    ? formatFirstName(client.first_name)
    : formatCompanyName(client.name);
  const contact = contactSentence(profile);

  // Aperçu (preview) et corps adaptés au contexte (a consulté / pas consulté).
  const previewText =
    context === "viewed"
      ? `Une question sur le devis n°${quote.number} ? Je reste disponible.`
      : `Avez-vous bien reçu le devis n°${quote.number} ?`;

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

            {context === "viewed" ? (
              <>
                <Text style={paragraph}>
                  Vous avez consulté le devis n°{quote.number} d&apos;un montant
                  de {formatEuros(quote.total)} TTC, mais je n&apos;ai pas encore
                  reçu votre signature.
                </Text>
                <Text style={paragraph}>
                  Si quelque chose ne va pas — une erreur, un élément que vous ne
                  souhaitez pas, une question sur le prix ou les délais —{" "}
                  {contact}. Je m&apos;en occupe avec plaisir et on ajuste
                  ensemble si besoin.
                </Text>
              </>
            ) : (
              <>
                <Text style={paragraph}>
                  Je voulais m&apos;assurer que vous avez bien reçu le devis n°
                  {quote.number} d&apos;un montant de {formatEuros(quote.total)}{" "}
                  TTC que je vous ai envoyé.
                </Text>
                <Text style={paragraph}>
                  Vous pouvez le consulter et le signer en un clic ci-dessous. Si
                  vous avez la moindre question, {contact}.
                </Text>
              </>
            )}

            {stage === "j14" && (
              <Text style={paragraph}>
                Sans retour de votre part, je clôturerai ce devis prochainement —
                mais je reste bien sûr disponible si vous souhaitez avancer.
              </Text>
            )}

            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href={signLink}
                style={{ ...button, backgroundColor: color }}
              >
                Voir et signer le devis →
              </Button>
            </Section>

            <Text style={signoff}>
              Bien à vous,
              <br />
              {company}
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerStrong}>{company}</Text>
            {profile.address && (
              <Text style={footerLine}>{profile.address}</Text>
            )}
            {(profile.postal_code || profile.city) && (
              <Text style={footerLine}>
                {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
              </Text>
            )}
            {profile.email && <Text style={footerLine}>{profile.email}</Text>}
            {profile.telephone && (
              <Text style={footerLine}>{profile.telephone}</Text>
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
