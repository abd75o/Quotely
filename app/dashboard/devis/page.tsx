import type { Metadata } from "next";
import { QuotesList } from "@/components/quotes/QuotesList";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { getMonthlyQuoteUsage, type QuoteUsage } from "@/lib/quotes/quota";

export const metadata: Metadata = {
  title: "Mes devis — Quovi",
};

// Fetch the quotes AND the monthly quota in one pass. The quota uses the SAME
// helper as the server cap (lib/quotes/quota), so the "X / Y devis ce mois"
// badge can never diverge from what the API enforces.
async function getQuotesAndUsage() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { quotes: [], usage: null };

    const [quotesRes, usage] = await Promise.all([
      supabase
        .from("quotes")
        .select("id, number, status, total, subtotal, tax_rate, tax_amount, signature_token, signature_type, items, valid_until, created_at, notes, client:clients(name, first_name, email)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      getMonthlyQuoteUsage(supabase, user.id),
    ]);

    if (quotesRes.error) {
      console.error("getQuotes error:", quotesRes.error.message);
      return { quotes: [], usage };
    }

    const quotes = (quotesRes.data ?? []).map((q) => ({
      ...q,
      client: Array.isArray(q.client) ? (q.client[0] ?? null) : q.client,
    }));
    return { quotes, usage };
  } catch {
    return { quotes: [], usage: null };
  }
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const { quotes, usage } = await getQuotesAndUsage();

  return (
    <>
      {welcome === "1" && <WelcomeBanner />}
      <QuotesList
        initialQuotes={quotes as Parameters<typeof QuotesList>[0]["initialQuotes"]}
        usage={usage as QuoteUsage | null}
      />
    </>
  );
}
