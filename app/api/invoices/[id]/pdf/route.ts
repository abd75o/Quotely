import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoicePdfById } from "@/lib/invoices/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// PDF d'une facture — OWNER UNIQUEMENT (session + RLS). Contrairement au PDF
// devis, AUCUN accès public par token : une facture n'est jamais partagée via
// lien anonyme. generateInvoicePdfById lit via le client session → RLS garantit
// que l'artisan ne peut générer que SES factures.
//   GET /api/invoices/[id]/pdf            → aperçu inline
//   GET /api/invoices/[id]/pdf?download=1 → téléchargement (attachment)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  let buffer: Buffer;
  try {
    buffer = await generateInvoicePdfById(supabase, id);
  } catch (e) {
    const msg = (e as Error).message ?? "Erreur";
    // RLS filtre les factures d'autrui → maybeSingle null → "Facture introuvable".
    const notFound = /introuvable/i.test(msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: notFound ? 404 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Numéro pour le nom de fichier : best-effort (revient sur l'id si indispo).
  const { data: row } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("id", id)
    .maybeSingle();
  const number = (row?.invoice_number as string | undefined) ?? id;

  const download = req.nextUrl.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="Facture-${number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
