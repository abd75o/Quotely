import type { Metadata } from "next";
import { QuotesList } from "@/components/quotes/QuotesList";

export const metadata: Metadata = {
  title: "Mes devis — Quotely",
};

const MOCK_QUOTES = [
  {
    id: "mock-1",
    number: "QTL-2026-0042",
    status: "pending",
    total: 1_250,
    subtotal: 1_041.67,
    tax_rate: 20,
    tax_amount: 208.33,
    public_token: "demo-token-1",
    signature_type: "simple",
    client: { name: "Marc Dupont", email: "marc@example.fr" },
    items: [{ id: "1", description: "Installation électrique appartement", quantity: 1, unitPrice: 1_041.67, total: 1_041.67 }],
    valid_until: new Date(Date.now() + 25 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    notes: "",
  },
  {
    id: "mock-2",
    number: "QTL-2026-0038",
    status: "signed",
    total: 3_600,
    subtotal: 3_000,
    tax_rate: 20,
    tax_amount: 600,
    public_token: "demo-token-2",
    signature_type: "email_confirmed",
    client: { name: "Sophie Martin", email: "sophie@example.fr" },
    items: [{ id: "1", description: "Rénovation salle de bain complète", quantity: 1, unitPrice: 3_000, total: 3_000 }],
    valid_until: new Date(Date.now() + 10 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 12 * 86400_000).toISOString(),
    notes: "Travaux sur 3 jours.",
  },
  {
    id: "mock-3",
    number: "QTL-2026-0031",
    status: "refused",
    total: 8_400,
    subtotal: 7_000,
    tax_rate: 20,
    tax_amount: 1_400,
    public_token: "demo-token-3",
    signature_type: "yousign",
    client: { name: "Jean Bernard", email: "jean@example.fr" },
    items: [{ id: "1", description: "Réfection toiture complète 120m²", quantity: 1, unitPrice: 7_000, total: 7_000 }],
    valid_until: new Date(Date.now() - 5 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 35 * 86400_000).toISOString(),
    notes: "",
  },
  {
    id: "mock-4",
    number: "QTL-2026-0027",
    status: "invoiced",
    total: 540,
    subtotal: 450,
    tax_rate: 20,
    tax_amount: 90,
    public_token: "demo-token-4",
    signature_type: "simple",
    client: { name: "Isabelle Moreau", email: "i.moreau@example.fr" },
    items: [
      { id: "1", description: "Peinture chambre principale", quantity: 1, unitPrice: 280, total: 280 },
      { id: "2", description: "Peinture couloir", quantity: 1, unitPrice: 170, total: 170 },
    ],
    valid_until: new Date(Date.now() - 15 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 45 * 86400_000).toISOString(),
    notes: "",
  },
];

async function getQuotes() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("quotes")
      .select("id, number, status, total, subtotal, tax_rate, tax_amount, public_token, signature_type, items, valid_until, created_at, notes, client:clients(name, email)")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false });

    if (error || !data?.length) throw new Error("fallback");
    return data;
  } catch {
    return MOCK_QUOTES;
  }
}

export default async function QuotesPage() {
  const quotes = await getQuotes();
  return <QuotesList initialQuotes={quotes as Parameters<typeof QuotesList>[0]["initialQuotes"]} />;
}
