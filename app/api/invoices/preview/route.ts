import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdfBuffer } from "@/lib/pdf/generate";
import { quoteItemsToLines } from "@/lib/invoices/pdf";
import type { PdfClient, PdfProfile } from "@/lib/pdf/quote-template";
import type { InvoicePdfData } from "@/lib/pdf/invoice-template";
import type { InvoiceType } from "@/lib/invoices/create";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// APERÇU DEV UNIQUEMENT — rend le PDF d'une facture d'EXEMPLE à partir d'un
// devis existant, SANS rien persister (ni facture, ni numéro consommé). Sert
// à visualiser le template pendant le dev. Bloqué en production.
//
//   GET /api/invoices/preview                       → dernier devis, type totale
//   GET /api/invoices/preview?type=acompte&acompte=30
//   GET /api/invoices/preview?quote=<quoteId>&type=solde&acompte=40
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sp = req.nextUrl.searchParams;
  const typeParam = sp.get("type") ?? "totale";
  const type: InvoiceType = (["acompte", "solde", "totale"] as const).includes(
    typeParam as InvoiceType,
  )
    ? (typeParam as InvoiceType)
    : "totale";
  const acompteParam = Number(sp.get("acompte"));
  const acompte_percent =
    Number.isFinite(acompteParam) && acompteParam > 0 && acompteParam < 100
      ? acompteParam
      : 30;
  const quoteIdParam = sp.get("quote");

  // Devis source : celui demandé, sinon le plus récent de l'artisan.
  let query = supabase
    .from("quotes")
    .select("id, number, items, clients(*)")
    .eq("user_id", user.id);
  query = quoteIdParam
    ? query.eq("id", quoteIdParam)
    : query.order("created_at", { ascending: false }).limit(1);
  const { data: rows, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const quote = Array.isArray(rows) ? rows[0] : rows;
  if (!quote) {
    return new Response(
      JSON.stringify({
        error:
          "Aucun devis trouvé pour cet artisan. Crée d'abord un devis, ou passe ?quote=<id>.",
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Émetteur = profil LIVE (aperçu) ; en vrai ce sera emitter_snapshot figé.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile: PdfProfile = {
    ...((profileRow ?? {}) as Record<string, unknown>),
    email:
      ((profileRow as Record<string, unknown> | null)?.email as string) ??
      user.email ??
      null,
  } as PdfProfile;

  const clientRow = Array.isArray(quote.clients)
    ? (quote.clients[0] as Record<string, unknown> | undefined)
    : ((quote.clients as Record<string, unknown> | null) ?? undefined);
  const client: PdfClient = clientRow
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
    : { name: "Client d'exemple" };

  const year = new Date().getFullYear();
  const invoice: InvoicePdfData = {
    // Numéro fictif d'aperçu — AUCUN compteur consommé.
    invoice_number: `FAC-${year}-00001`,
    issued_at: new Date().toISOString().slice(0, 10),
    type,
    acompte_percent: type === "totale" ? null : acompte_percent,
    quote_number: (quote.number as string | null) ?? null,
    items: quoteItemsToLines(quote.items),
  };

  let buffer: Buffer;
  try {
    buffer = await generateInvoicePdfBuffer({ invoice, profile, client });
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
      "Content-Disposition": `inline; filename="apercu-facture-${type}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
