import { NextRequest } from "next/server";
import { getSignatureType } from "@/types";
import {
  computeQuoteTotals,
  normalizeQuoteItems,
} from "@/lib/quotes/items";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // NOTE: we used to embed `artisan:users(name, company, email, phone, siret)`
    // here. The `users` table lives in the `auth` schema and is NOT exposed via
    // PostgREST — that embed silently 500'd, the route returned 404, and the
    // Émile panel never hydrated when reopening a conversation (BUG #2).
    // Callers that need artisan info should join `profiles` separately.
    // `.eq(user_id)` = defense-in-depth on top of RLS.
    const { data, error } = await supabase
      .from("quotes")
      .select("*, client:clients(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/quotes/:id] query failed", error);
      return Response.json({ error: "Query failed" }, { status: 500 });
    }
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ quote: data });
  } catch (e) {
    console.error("[GET /api/quotes/:id] threw", e);
    return Response.json({ error: "Server error" }, { status: 500 });
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

  // Manual client (re)assignment from the right-panel "Sélectionner un client"
  // button. Accept the camelCase alias the AI SDK / front-end already uses for
  // other fields, plus the snake_case form for symmetry with the DB column.
  const clientIdRaw = body.clientId ?? body.client_id;
  if (clientIdRaw !== undefined) {
    if (clientIdRaw === null || clientIdRaw === "") {
      update.client_id = null;
    } else if (typeof clientIdRaw === "string") {
      update.client_id = clientIdRaw;
    }
  }

  if (body.items && Array.isArray(body.items)) {
    // Accept either legacy {description, unitPrice, total} or canonical
    // {label, price, quantity, unite, tva}. The normalizer stores the
    // canonical shape so the PDF + send pipelines read the same thing the
    // bulk-lines / saveQuoteDraft writers produce.
    const defaultTva = Number(body.taxRate ?? body.tax_rate ?? 20);
    const items = normalizeQuoteItems(body.items, defaultTva);
    const totals = computeQuoteTotals(items);

    update.items = items;
    update.subtotal = totals.subtotal;
    update.tax_rate = totals.taxRate;
    update.tax_amount = totals.taxAmount;
    update.tax_breakdown = totals.taxBreakdown;
    update.total = totals.total;
    update.signature_type = getSignatureType(totals.total);
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("quotes")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*, client:clients(*)")
      .maybeSingle();

    if (error) throw error;
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Scope by user_id (defense-in-depth on top of RLS) and NEVER report
    // success on a real failure — the old `catch { success:true }` lied to the
    // UI, which then removed a quote that was still in the DB (audit finding).
    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[DELETE /api/quotes/:id] delete failed", error);
      return Response.json({ error: "Delete failed" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/quotes/:id] threw", e);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
