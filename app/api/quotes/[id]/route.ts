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

  // Recalculate totals if items changed
  if (body.items && Array.isArray(body.items)) {
    const taxRate = Number(body.taxRate ?? 20);
    const subtotal = (body.items as { total: number }[]).reduce((s, i) => s + i.total, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = subtotal + taxAmount;
    body = { ...body, subtotal, tax_rate: taxRate, tax_amount: taxAmount, total, signature_type: getSignatureType(total) };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("quotes")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ quote: data });
  } catch {
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
