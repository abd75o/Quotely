export type QuoteStatus = "draft" | "pending" | "signed" | "refused" | "invoiced";
export type PlanType = "starter" | "pro";

// ─── Signature ────────────────────────────────────────────────────────────────
/**
 * simple          < 1 500 € — finger draw or name + checkbox
 * email_confirmed 1 500–5 000 € — finger draw + mandatory email confirmation
 * yousign         > 5 000 € — YouSign API (eIDAS certified)
 */
export type SignatureType = "simple" | "email_confirmed" | "yousign";

export function getSignatureType(totalEuros: number): SignatureType {
  if (totalEuros < 1_500) return "simple";
  if (totalEuros <= 5_000) return "email_confirmed";
  return "yousign";
}

export function getSignatureLabel(type: SignatureType): string {
  switch (type) {
    case "simple":          return "Signature simple";
    case "email_confirmed": return "Signature + confirmation email";
    case "yousign":         return "Signature certifiée eIDAS";
  }
}

export function getSignatureBadge(type: SignatureType) {
  switch (type) {
    case "simple":
      return { label: "Signature simple", color: "bg-blue-50 text-blue-700 border-blue-200" };
    case "email_confirmed":
      return { label: "Signature + email", color: "bg-amber-50 text-amber-700 border-amber-200" };
    case "yousign":
      return { label: "Certifiée eIDAS", color: "bg-violet-50 text-violet-700 border-violet-200" };
  }
}

// ─── Entities ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  plan: PlanType;
  createdAt: Date;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: Date;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  userId: string;
  clientId: string;
  client?: Client;
  /** Artisan info (denormalized for the public client page) */
  artisan?: {
    name: string;
    company?: string;
    email: string;
    phone?: string;
    siret?: string;
  };
  number: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: Date;
  notes?: string;
  /** Unique public token for the client-facing signature link */
  publicToken: string;
  signatureType: SignatureType;
  signedAt?: Date;
  signatureData?: string; // base64 image or YouSign procedure ID
  signatureConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  quoteId: string;
  quote?: Quote;
  number: string;
  issuedAt: Date;
  dueDate: Date;
  paidAt?: Date;
  total: number;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  plan: PlanType;
  billing: "monthly" | "annual";
  status: "active" | "canceled" | "past_due" | "trialing";
  trialEndsAt?: Date;
  currentPeriodEnd: Date;
}
