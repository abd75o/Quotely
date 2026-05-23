import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QuotePreview } from "@/components/quotes/QuotePreview";

interface ProfileRow {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  company?: string | null;
  telephone?: string | null;
  siret?: string | null;
  logo_url?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  legal_status?: string | null;
  registration_number?: string | null;
  registration_city?: string | null;
  decennale_company?: string | null;
  decennale_number?: string | null;
  rc_pro_number?: string | null;
}

// Quotes can be persisted with two different JSON shapes:
//  - legacy / LineItemsEditor flow ........ { description, quantity, unitPrice, total }
//  - Emile chat flow (lib/emile/tools.ts) . { label,       quantity, price,     tva   }
// QuotePreview only renders the legacy shape, so normalize at read-time.
interface RawQuoteItem {
  id?: string;
  description?: string;
  label?: string;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  total?: number;
}

function normalizeItem(raw: RawQuoteItem, idx: number) {
  const quantity = Number(raw?.quantity ?? 0);
  const unitPrice = Number(raw?.unitPrice ?? raw?.price ?? 0);
  const total =
    raw?.total != null
      ? Number(raw.total)
      : Math.round(quantity * unitPrice * 100) / 100;
  return {
    id: String(raw?.id ?? `item-${idx}`),
    description: String(raw?.description ?? raw?.label ?? ""),
    quantity,
    unitPrice,
    total,
  };
}

async function getQuote(id: string) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // The previous SELECT joined `users(...)` — that table is not exposed
    // via PostgREST (Supabase auth lives in auth.users, app profile lives in
    // `profiles`). The join silently 500'd, `data` was null and the page
    // bailed with a 404. We now fetch the artisan profile separately and
    // map it into the QuotePreview-expected `artisan` shape.
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*, client:clients(*)")
      .eq("id", id)
      .single();

    if (error || !quote) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "first_name, last_name, company_name, company, telephone, siret, logo_url, address, postal_code, city, legal_status, registration_number, registration_city, decennale_company, decennale_number, rc_pro_number",
      )
      .eq("id", (quote as { user_id: string }).user_id)
      .maybeSingle();

    const p = (profile ?? {}) as ProfileRow;
    const fullName = [p.first_name, p.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    const rawItems = Array.isArray((quote as { items?: unknown }).items)
      ? ((quote as { items: RawQuoteItem[] }).items)
      : [];
    const items = rawItems.map(normalizeItem);

    return {
      ...quote,
      items,
      artisan: {
        name: fullName || user?.email?.split("@")[0] || "Prestataire",
        company: p.company_name ?? p.company ?? undefined,
        email: user?.email ?? "",
        phone: p.telephone ?? undefined,
        siret: p.siret ?? undefined,
        logo_url: p.logo_url ?? undefined,
        address: p.address ?? undefined,
        postal_code: p.postal_code ?? undefined,
        city: p.city ?? undefined,
        legal_status: p.legal_status ?? undefined,
        registration_number: p.registration_number ?? undefined,
        registration_city: p.registration_city ?? undefined,
        decennale_company: p.decennale_company ?? undefined,
        decennale_number: p.decennale_number ?? undefined,
        rc_pro_number: p.rc_pro_number ?? undefined,
      },
    };
  } catch (e) {
    console.error("[devis/[id]] getQuote failed:", e);
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

  return (
    <QuotePreview
      quote={quote as Parameters<typeof QuotePreview>[0]["quote"]}
    />
  );
}
