import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate";
import type {
  PdfClient,
  PdfProfile,
  PdfQuote,
} from "@/lib/pdf/quote-template";

export const runtime = "nodejs";
export const maxDuration = 60;

interface QuoteItemRaw {
  id?: string;
  label?: string;
  price?: number;
  quantity?: number;
  unite?: string | null;
  tva?: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const token = req.nextUrl.searchParams.get("token");

  // Accès propriétaire OU accès public via signature_token
  let query = supabase
    .from("quotes")
    .select(
      "id, user_id, client_id, number, status, items, subtotal, tax_rate, tax_amount, total, valid_until, notes, signature_token, signed_at, signature_data, created_at, clients(*)",
    )
    .eq("id", id);

  if (token) {
    query = query.eq("signature_token", token);
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    query = query.eq("user_id", user.id);
  }

  const { data: quote, error } = await query.maybeSingle();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!quote) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Payment configuration (acompte / échéancier). Read DEFENSIVELY in its own
  // query: these two columns are added by a migration; if that migration hasn't
  // been applied yet the select returns an error (which we ignore) instead of
  // breaking the whole PDF. Same access gate as the main query.
  let acompte_percent: number | null = null;
  let payment_terms: string | null = null;
  {
    let payQuery = supabase
      .from("quotes")
      .select("acompte_percent, payment_terms")
      .eq("id", id);
    payQuery = token
      ? payQuery.eq("signature_token", token)
      : payQuery.eq("user_id", quote.user_id as string);
    const { data: pay, error: payErr } = await payQuery.maybeSingle();
    if (payErr) {
      // Expected only if the acompte migration hasn't been applied; still log
      // so a real RLS/schema problem doesn't hide behind the graceful fallback.
      console.error("[quotes/:id/pdf] acompte/payment_terms read error:", payErr);
    }
    if (pay) {
      const ap = (pay as { acompte_percent?: number | string | null })
        .acompte_percent;
      acompte_percent =
        typeof ap === "number" ? ap : ap != null ? Number(ap) : null;
      payment_terms =
        (pay as { payment_terms?: string | null }).payment_terms ?? null;
    }
  }

  // RÈGLE MÉTIER draft=live / sent=snapshot. Un devis envoyé/signé doit figer
  // l'émetteur : on relit le snapshot pris à l'envoi (emitter_snapshot) plutôt
  // que le profil vivant, pour que les éditions de profil postérieures ne
  // modifient pas un document déjà transmis. Lecture DÉFENSIVE (requête séparée)
  // pour que l'absence de colonne ne casse pas le PDF. Un brouillon, lui, lit
  // toujours le profil LIVE.
  const isFrozen = (quote.status as string) !== "draft";
  let frozenSnapshot: Record<string, unknown> | null = null;
  if (isFrozen) {
    let snapQuery = supabase
      .from("quotes")
      .select("emitter_snapshot")
      .eq("id", id);
    snapQuery = token
      ? snapQuery.eq("signature_token", token)
      : snapQuery.eq("user_id", quote.user_id as string);
    const { data: snap, error: snapErr } = await snapQuery.maybeSingle();
    if (snapErr) {
      console.error("[quotes/:id/pdf] emitter_snapshot read error:", snapErr);
    }
    const raw = (snap as { emitter_snapshot?: unknown } | null)?.emitter_snapshot;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      frozenSnapshot = raw as Record<string, unknown>;
    }
  }

  // When the artisan downloads their own PDF, RLS lets them read their
  // profile. When the client opens the PDF from the email link (anon +
  // signature_token), RLS blocks it and the PDF would render with an empty
  // emitter (broken doc on every shared link). The signature_token already
  // gates access to the quote, so we re-use that proof to fetch the profile
  // via the admin client whenever the token path is taken.
  //
  // Skip the live fetch entirely when we already have a frozen snapshot.
  let profile: Record<string, unknown> | null = frozenSnapshot;
  if (!profile) {
    const profileClient = token ? getSupabaseAdmin() : supabase;
    const { data: live } = await profileClient
      .from("profiles")
      .select("*")
      .eq("id", quote.user_id as string)
      .maybeSingle();
    profile = (live as Record<string, unknown> | null) ?? null;
  }

  const items = Array.isArray(quote.items)
    ? (quote.items as QuoteItemRaw[])
    : [];
  const clientRow = Array.isArray(quote.clients)
    ? (quote.clients[0] as Record<string, unknown> | undefined)
    : ((quote.clients as Record<string, unknown> | null) ?? undefined);

  const sigDataRaw = (quote as { signature_data?: unknown }).signature_data;
  const signatureData =
    sigDataRaw && typeof sigDataRaw === "object" && !Array.isArray(sigDataRaw)
      ? (sigDataRaw as Record<string, unknown>)
      : null;

  const pdfQuote: PdfQuote = {
    number: quote.number as string,
    status: quote.status as string,
    created_at: quote.created_at as string,
    valid_until: (quote.valid_until as string | null) ?? null,
    items: items.map((it, idx) => ({
      id: String(it.id ?? `l-${idx}`),
      label: String(it.label ?? "Prestation"),
      quantity: Number(it.quantity ?? 1),
      unite: (it.unite ?? null) as string | null,
      price: Number(it.price ?? 0),
      tva: Number(it.tva ?? quote.tax_rate ?? 20),
    })),
    subtotal: Number(quote.subtotal),
    tax_rate: Number(quote.tax_rate),
    tax_amount: Number(quote.tax_amount),
    total: Number(quote.total),
    acompte_percent,
    payment_terms,
    notes: (quote.notes as string | null) ?? null,
    signed_at: (quote as { signed_at?: string | null }).signed_at ?? null,
    signature_data: signatureData,
    signature_token:
      (quote as { signature_token?: string | null }).signature_token ?? null,
  };

  const profileForPdf: PdfProfile = (profile ?? {}) as PdfProfile;
  // No "Client" string fallback: shipping a PDF where the recipient block reads
  // "Client" instead of the real person is a legal hole (devis nominatif), so
  // we surface an empty name and let the upstream caller — sendQuote already
  // 422s on missing client — be the one to refuse.
  const clientForPdf: PdfClient = clientRow
    ? {
        name: String(clientRow.name ?? ""),
        first_name: (clientRow.first_name as string | null) ?? null,
        company_name: (clientRow.company_name as string | null) ?? null,
        email: (clientRow.email as string | null) ?? null,
        phone: (clientRow.phone as string | null) ?? null,
        telephone: (clientRow.telephone as string | null) ?? null,
        address: (clientRow.address as string | null) ?? null,
        postal_code: (clientRow.postal_code as string | null) ?? null,
        city: (clientRow.city as string | null) ?? null,
        type_client:
          (clientRow.type_client as "particulier" | "professionnel" | null) ??
          null,
        siret: (clientRow.siret as string | null) ?? null,
        civility: (clientRow.civility as string | null) ?? null,
      }
    : { name: "" };

  let buffer: Buffer;
  try {
    buffer = await generateQuotePdfBuffer({
      quote: pdfQuote,
      profile: profileForPdf,
      client: clientForPdf,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "PDF échoué" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Devis-${quote.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
