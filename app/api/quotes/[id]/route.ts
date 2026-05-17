import { NextRequest } from "next/server";
import { getSignatureType } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quotes")
      .select("*, client:clients(*), artisan:users(name, company, email, phone, siret)")
      .eq("id", id)
      .single();

    if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ quote: data });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Build update payload explicitly — never spread `body` into the DB call:
  // camelCase keys (taxRate, validUntil) silently no-op against Postgres
  // columns (tax_rate, valid_until), so writes were being dropped.
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.notes === "string" || body.notes === null) update.notes = body.notes;
  const validUntilRaw = body.validUntil ?? body.valid_until;
  if (validUntilRaw !== undefined) update.valid_until = validUntilRaw;

  if (body.items && Array.isArray(body.items)) {
    const items = body.items as { total?: number; quantity?: number; unitPrice?: number }[];
    const taxRate = Number(body.taxRate ?? body.tax_rate ?? 20);
    const subtotal = items.reduce(
      (s, i) =>
        s +
        (Number(i.total) || (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)),
      0,
    );
    const subtotalRounded = Math.round(subtotal * 100) / 100;
    const taxAmount = Math.round(subtotalRounded * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotalRounded + taxAmount) * 100) / 100;

    update.items = items;
    update.subtotal = subtotalRounded;
    update.tax_rate = taxRate;
    update.tax_amount = taxAmount;
    update.total = total;
    update.signature_type = getSignatureType(total);
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quotes")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ quote: data });
  } catch (e) {
    console.error("[PUT /api/quotes/:id] update failed", e);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) throw error;

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: true }); // dev fallback
  }
}
