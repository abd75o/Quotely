import { NextRequest } from "next/server";
import { notifyArtisanSigned } from "@/lib/signature";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { code: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.code || body.code.length < 6) {
    return Response.json({ error: "code required" }, { status: 400 });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select("*, client:clients(*), artisan:users(name, company, email, phone, siret)")
    .eq("public_token", id)
    .eq("status", "pending")
    .single();

  if (fetchError || !quote) {
    return Response.json({ error: "Quote not found" }, { status: 404 });
  }

  // Verify token
  const storedToken: string = quote.confirmation_token ?? "";
  const expectedCode = storedToken.slice(0, 6).toUpperCase();
  const submittedCode = body.code.toUpperCase().trim();

  if (submittedCode !== expectedCode) {
    return Response.json({ error: "Invalid code" }, { status: 400 });
  }

  // Check expiry
  const expiresAt = quote.confirmation_token_expires_at
    ? new Date(quote.confirmation_token_expires_at)
    : null;

  if (expiresAt && expiresAt < new Date()) {
    return Response.json({ error: "Code expired" }, { status: 400 });
  }

  // Mark as signed
  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_confirmed_at: new Date().toISOString(),
      confirmation_token: null,
      confirmation_token_expires_at: null,
    })
    .eq("id", quote.id);

  if (updateError) {
    return Response.json({ error: "Failed to confirm signature" }, { status: 500 });
  }

  // Generate invoice
  await generateInvoice(supabase, quote);

  // Notify artisan
  await notifyArtisanIfPossible(quote);

  return Response.json({ success: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateInvoice(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  quote: { id: string; number: string; total: number; user_id?: string; userId?: string }
) {
  const year = new Date().getFullYear();
  const invoiceNumber = `FAC-${year}-${Date.now().toString().slice(-6)}`;

  await supabase.from("invoices").insert({
    quote_id: quote.id,
    user_id: quote.user_id ?? quote.userId,
    number: invoiceNumber,
    issued_at: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    total: quote.total,
  });
}

async function notifyArtisanIfPossible(quote: {
  artisan?: { email?: string; name?: string; company?: string } | null;
  client?: { name?: string } | null;
  number?: string;
  total?: number;
  id?: string;
}) {
  if (!quote.artisan?.email) return;

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://quotely.fr";
  await notifyArtisanSigned({
    artisanEmail: quote.artisan.email,
    artisanName: quote.artisan.company ?? quote.artisan.name ?? "Artisan",
    clientName: quote.client?.name ?? "Votre client",
    quoteNumber: quote.number ?? "",
    totalEuros: quote.total ?? 0,
    quoteUrl: `${origin}/dashboard/quotes/${quote.id}`,
  }).catch(console.error);
}
