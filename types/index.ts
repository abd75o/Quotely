export type QuoteStatus = "draft" | "pending" | "signed" | "refused" | "invoiced";
export type PlanType = "starter" | "pro";

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
  number: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil: Date;
  notes?: string;
  signedAt?: Date;
  signatureUrl?: string;
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
  plan: PlanType;
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: Date;
}
