import { NextRequest } from "next/server";
import { generatePublicToken } from "@/lib/signature";
import { getSignatureType } from "@/types";
import {
  computeQuoteTotals,
  normalizeQuoteItems,
} from "@/lib/quotes/items";

function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `QTL-${year}-${seq}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("quotes")
      .select("*, client:clients(id, name, email)")
      .order("created_at", { ascending: false })
      .eq("user_id", user.id);

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ quotes: data ?? [] });
  } catch (err) {
    console.error("[api/quotes] GET failed:", err);
    return Response.json(
      { error: "Failed to load quotes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: {
    clientId?: string;
    newClient?: { name: string; email: string; phone?: string };
    number?: string;
    taxRate?: number;
    items: unknown;
    validUntil?: string;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const defaultTva = Number.isFinite(Number(body.taxRate))
    ? Number(body.taxRate)
    : 20;
  const items = normalizeQuoteItems(body.items, defaultTva);
  const totals = computeQuoteTotals(items);

  const quoteNumber = body.number || generateQuoteNumber();
  const publicToken = generatePublicToken();
  const signatureType = getSignatureType(totals.total);
  const validUntil = body.validUntil || new Date(Date.now() + 30 * 86400_000).toISOString();

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let clientId = body.clientId;

    // Create client on the fly if needed
    if (!clientId && body.newClient) {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ user_id: user.id, ...body.newClient })
        .select()
        .single();
      if (!clientError) clientId = newClient.id;
    }

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        user_id: user.id,
        client_id: clientId,
        number: quoteNumber,
        status: "draft",
        items,
        subtotal: totals.subtotal,
        tax_rate: totals.taxRate,
        tax_amount: totals.taxAmount,
        tax_breakdown: totals.taxBreakdown,
        total: totals.total,
        valid_until: validUntil,
        notes: body.notes ?? null,
        public_token: publicToken,
        signature_type: signatureType,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ quote: data }, { status: 201 });
  } catch (err) {
    console.error("[api/quotes] POST failed:", err);
    return Response.json(
      { error: "Failed to create quote" },
      { status: 500 },
    );
  }
}
