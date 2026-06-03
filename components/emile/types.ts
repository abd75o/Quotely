import { formatClientName } from "@/lib/text/name-normalize";

export interface EmileClient {
  id: string;
  name: string;
  first_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  type_client?: "particulier" | "professionnel" | null;
  siret?: string | null;
}

/**
 * Display name for a client: "Marc DUPONT" quand un prénom existe (prénom en
 * casse de titre, nom en majuscules), sinon la raison sociale en casse de titre
 * ("Linkity"). Normalisation à l'affichage déléguée à lib/text/name-normalize.
 * Utilisé par le panneau de devis + le fullscreen.
 */
export function clientFullName(
  client: Pick<EmileClient, "name" | "first_name"> | null | undefined,
): string {
  if (!client) return "";
  return formatClientName({ first_name: client.first_name, name: client.name });
}

export interface EmileQuoteLine {
  id: string;
  label: string;
  price: number;
  quantity: number;
  unit?: string | null;
  tva?: number | null;
}

export type EmileQuoteStatus =
  | "draft"
  | "ready"
  | "sent"
  | "viewed"
  | "signed"
  | "refused"
  | "expired";

export interface EmileQuoteSignature {
  signedAt: string;
  fullName?: string | null;
}

export interface EmileQuoteDraft {
  id?: string;
  number: string;
  client: EmileClient | null;
  date: string;
  validity: number;
  tva: number;
  lines: EmileQuoteLine[];
  status: EmileQuoteStatus;
  sentAt?: string | null;
  viewedAt?: string | null;
  signature?: EmileQuoteSignature | null;
}
