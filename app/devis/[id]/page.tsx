import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Quote } from "@/types";
import { SignatureClient } from "./SignatureClient";

// Legacy public signature route. New canonical is /sign/[token]. Kept alive
// for bookmarked URLs that point at the old `public_token` flow.
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
  } catch (err) {
    console.error("[devis/[id]] getQuoteByPublicToken failed:", err);
    return null;
  }
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
