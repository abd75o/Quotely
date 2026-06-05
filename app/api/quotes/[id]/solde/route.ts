import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeGenerateSolde, postSoldeNotice } from "@/lib/invoices/solde";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/quotes/[id]/solde — génère la facture de SOLDE du devis [id].
// Action de l'artisan connecté (auth.uid / RLS) ; pas d'API publique.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const result = await executeGenerateSolde({
    supabase,
    userId: user.id,
    quoteId: id,
  });

  if (!result.ok || !result.invoice) {
    return jsonResponse(
      { error: result.error, existingSoldeId: result.existingSoldeId },
      result.status,
    );
  }

  // Notif Émile — best-effort, n'invalide jamais la création de la facture.
  try {
    const { data: quote } = await supabase
      .from("quotes")
      .select("number")
      .eq("id", id)
      .maybeSingle();
    await postSoldeNotice(supabase, {
      invoice: result.invoice,
      quoteNumber: (quote?.number as string | undefined) ?? "",
      userId: user.id,
    });
  } catch (e) {
    console.error("[SOLDE] notif Émile échouée (non bloquant)", e);
  }

  return jsonResponse({ success: true, invoiceId: result.invoice.id });
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
