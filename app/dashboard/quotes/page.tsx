import type { Metadata } from "next";
import { QuotesList } from "@/components/quotes/QuotesList";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";

export const metadata: Metadata = {
  title: "Mes devis — Quotely",
};

async function getQuotes() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("quotes")
      .select("id, number, status, total, subtotal, tax_rate, tax_amount, public_token, signature_type, items, valid_until, created_at, notes, client:clients(name, email)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getQuotes error:", error.message);
      return [];
    }

    return (data ?? []).map((q) => ({
      ...q,
      client: Array.isArray(q.client) ? (q.client[0] ?? null) : q.client,
    }));
  } catch {
    return [];
  }
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const quotes = await getQuotes();

  return (
    <>
      {welcome === "1" && <WelcomeBanner />}
      <QuotesList initialQuotes={quotes as Parameters<typeof QuotesList>[0]["initialQuotes"]} />
    </>
  );
}
