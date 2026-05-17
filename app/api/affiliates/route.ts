// Admin-only: CRUD on affiliates. Authentication via Supabase session +
// gate on ADMIN_USER_IDS env var. Writes use service_role to bypass the
// SELECT-only RLS policy on affiliates.

import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminUserId } from "@/lib/auth/admin";
import { generatePromoCode } from "@/lib/affiliates/code";

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminUserId(user?.id)) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("affiliates")
    .select(
      "id, user_id, name, email, promo_code, commission_rate, duration_months, lifetime_residual_rate, tier, stripe_connect_account_id, status, total_clients_referred, total_revenue_generated, total_commission_paid, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ affiliates: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || !email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }

  const promoCode =
    typeof body.promo_code === "string" && body.promo_code.trim()
      ? body.promo_code.trim().toUpperCase()
      : generatePromoCode(name);

  const payload = {
    user_id: typeof body.user_id === "string" ? body.user_id : null,
    name,
    email,
    promo_code: promoCode,
    commission_rate:
      typeof body.commission_rate === "number" ? body.commission_rate : 0.3,
    duration_months:
      typeof body.duration_months === "number" ? body.duration_months : 12,
    lifetime_residual_rate:
      typeof body.lifetime_residual_rate === "number"
        ? body.lifetime_residual_rate
        : 0,
    tier:
      body.tier === "vip" || body.tier === "strategic" ? body.tier : "standard",
    status: body.status === "active" ? "active" : "pending",
  };

  const { data, error } = await getSupabaseAdmin()
    .from("affiliates")
    .insert(payload)
    .select(
      "id, user_id, name, email, promo_code, commission_rate, duration_months, tier, status, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ affiliate: data });
}
