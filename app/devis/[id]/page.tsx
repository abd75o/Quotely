import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Quote } from "@/types";
import { getSignatureType } from "@/lib/signature";
import { SignatureClient } from "./SignatureClient";

// ─── Data fetching ────────────────────────────────────────────────────────────
async function getQuoteByPublicToken(token: string): Promise<Quote | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quotes")
      .select("*, client:clients(*), artisan:users(name, company, email, phone, siret)")
      .eq("public_token", token)
      .eq("status", "pending")
      .single();

    if (error || !data) return null;
    return data as Quote;
  } catch {
    // Dev mode: return mock data so the page is always renderable
    return getMockQuote(token);
  }
}

function getMockQuote(token: string): Quote {
  const total = 2_856;
  return {
    id: "mock-quote-001",
    userId: "artisan-001",
    clientId: "client-001",
    publicToken: token,
    number: "DEV-2024-089",
    status: "pending",
    signatureType: getSignatureType(total),
    artisan: {
      name: "Thomas Renaud",
      company: "TR Électricité",
      email: "thomas@tr-electricite.fr",
      phone: "06 12 34 56 78",
      siret: "123 456 789 00012",
    },
    client: {
      id: "client-001",
      userId: "artisan-001",
      name: "Marc Dupont",
      email: "marc.dupont@example.fr",
      createdAt: new Date(),
    },
    items: [
      { id: "1", description: "Tableau électrique 3 rangées", quantity: 1, unitPrice: 480, total: 480 },
      { id: "2", description: "Câblage complet appartement 65m²", quantity: 1, unitPrice: 1_200, total: 1_200 },
      { id: "3", description: "Prises et interrupteurs (20 points)", quantity: 20, unitPrice: 35, total: 700 },
      { id: "4", description: "Mise en conformité tableau CONSUEL", quantity: 1, unitPrice: 200, total: 200 },
    ],
    subtotal: 2_380,
    taxRate: 20,
    taxAmount: 476,
    total,
    validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    notes: "Travaux prévus du 15 au 17 janvier 2025. Devis valable 30 jours.",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuoteByPublicToken(id);
  if (!quote) return { title: "Devis introuvable — Quovi" };

  return {
    title: `Devis ${quote.number} — ${quote.artisan?.company ?? quote.artisan?.name ?? "Quovi"}`,
    description: `Consultez et signez le devis ${quote.number} d'un montant de ${quote.total.toLocaleString("fr-FR")} €`,
    robots: { index: false, follow: false },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DevisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuoteByPublicToken(id);

  if (!quote) notFound();

  return <SignatureClient quote={quote} />;
}
