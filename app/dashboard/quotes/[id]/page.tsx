import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QuotePreview } from "@/components/quotes/QuotePreview";

const MOCK_QUOTE = {
  id: "mock-1",
  number: "QTL-2026-0042",
  status: "pending",
  total: 1_250,
  subtotal: 1_041.67,
  tax_rate: 20,
  tax_amount: 208.33,
  public_token: "demo-token-1",
  signature_type: "simple",
  client: { name: "Marc Dupont", email: "marc@example.fr", phone: "06 12 34 56 78" },
  artisan: {
    name: "Thomas Renaud",
    company: "TR Électricité",
    email: "thomas@tr-electricite.fr",
    phone: "06 12 34 56 78",
    siret: "123 456 789 00012",
  },
  items: [
    { id: "1", description: "Tableau électrique 3 rangées", quantity: 1, unitPrice: 480, total: 480 },
    { id: "2", description: "Câblage complet appartement 65m²", quantity: 1, unitPrice: 320.83, total: 320.83 },
    { id: "3", description: "Prises et interrupteurs (20 points)", quantity: 20, unitPrice: 12, total: 240 },
    { id: "4", description: "Mise en conformité CONSUEL", quantity: 1, unitPrice: 0.84, total: 0.84 },
  ],
  valid_until: new Date(Date.now() + 25 * 86400_000).toISOString(),
  created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
  notes: "Travaux prévus du 15 au 17 mai 2026. Devis valable 30 jours.",
};

async function getQuote(id: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quotes")
      .select("*, client:clients(*), artisan:users(name, company, email, phone, siret)")
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("not found");
    return data;
  } catch {
    if (id.startsWith("mock-")) return MOCK_QUOTE;
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) return { title: "Devis introuvable — Quovi" };
  return { title: `Devis ${quote.number} — Quovi` };
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) notFound();

  return <QuotePreview quote={quote as Parameters<typeof QuotePreview>[0]["quote"]} />;
}
