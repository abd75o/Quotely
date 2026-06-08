import ReminderEmail, {
  type ReminderEmailProfile,
  type ReminderEmailClient,
  type ReminderEmailQuote,
  type ReminderStage,
  type ReminderContext,
} from "@/emails/ReminderEmail";
import { getResend, resendFromAddress } from "@/lib/resend/client";
import { formatCompanyName, formatFullName } from "@/lib/text/name-normalize";

// Envoi d'un email de relance (Iris ou relance manuelle). From = nom de
// l'artisan, reply-to = son email : Quovi reste invisible côté client final.
export interface SendReminderEmailInput {
  to: string;
  quote: ReminderEmailQuote;
  profile: ReminderEmailProfile;
  client: ReminderEmailClient;
  signLink: string;
  stage: ReminderStage;
  context: ReminderContext;
}

export interface SendReminderEmailResult {
  messageId: string | null;
  error?: string;
}

function companyDisplay(p: ReminderEmailProfile): string {
  const company = (p.company_name || p.company || "").trim();
  if (company) return formatCompanyName(company);
  const person = formatFullName(p.first_name, p.last_name);
  return person || "Votre prestataire";
}

// Construit le profil pour l'email de relance depuis le snapshot figé du devis
// (ce que le client a reçu), avec repli sur le profil live de l'artisan.
// Partagé par le moteur Iris et la relance manuelle.
export function buildReminderProfile(
  snapshot: Record<string, unknown> | null,
  live: Record<string, unknown> | null,
): ReminderEmailProfile {
  const s = snapshot ?? {};
  const l = live ?? {};
  const pick = (k: string) =>
    (s[k] as string | null | undefined) ??
    (l[k] as string | null | undefined) ??
    null;
  return {
    company_name: pick("company_name"),
    company: pick("company"),
    first_name: pick("first_name"),
    last_name: pick("last_name"),
    email: pick("email"),
    telephone: pick("telephone"),
    address: pick("address"),
    postal_code: pick("postal_code"),
    city: pick("city"),
    logo_url: pick("logo_url"),
    couleur_principale: pick("couleur_principale") ?? pick("brand_color"),
  };
}

// Sujet adapté au palier — anonymisé (porte le nom de l'artisan, pas Quovi).
function subjectFor(
  stage: ReminderStage,
  quoteNumber: string,
  company: string,
): string {
  if (stage === "j7") {
    return `Petit rappel concernant votre devis n°${quoteNumber} — ${company}`;
  }
  if (stage === "j14") {
    return `Dernière relance — votre devis n°${quoteNumber} — ${company}`;
  }
  return `Votre devis n°${quoteNumber} est toujours disponible — ${company}`;
}

export async function sendReminderEmail(
  input: SendReminderEmailInput,
): Promise<SendReminderEmailResult> {
  const { to, quote, profile, client, signLink, stage, context } = input;
  const company = companyDisplay(profile);

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: resendFromAddress(company),
      replyTo: profile.email ?? undefined,
      to,
      subject: subjectFor(stage, quote.number, company),
      react: ReminderEmail({ quote, profile, client, signLink, stage, context }),
      tags: [
        { name: "type", value: "reminder" },
        { name: "stage", value: stage },
      ],
    });
    if (result.error) {
      console.error("[REMINDER] Resend returned error", result.error);
      return { messageId: null, error: result.error.message };
    }
    return { messageId: result.data?.id ?? null };
  } catch (e) {
    console.error("[REMINDER] Resend threw", e);
    return {
      messageId: null,
      error: (e as Error).message ?? "Envoi relance échoué",
    };
  }
}
