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
