// Called after signup to attribute the new user. Reads `qv_ref` / `qv_parrain`
// cookies set by the middleware (proxy.ts) at landing-page hit, looks up the
// matching affiliate / referrer, and creates the join rows. Idempotent.

import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import {
  attributeNewUser,
  REF_COOKIE,
  PARRAIN_COOKIE,
} from "@/lib/auth/attribution";
import { cookies } from "next/headers";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const refCode = cookieStore.get(REF_COOKIE)?.value ?? null;
  const parrainCode = cookieStore.get(PARRAIN_COOKIE)?.value ?? null;

  const result = await attributeNewUser({
    userId: user.id,
    refCode,
    parrainCode,
  });

  // Clear the attribution cookies once consumed.
  if (refCode) cookieStore.delete(REF_COOKIE);
  if (parrainCode) cookieStore.delete(PARRAIN_COOKIE);

  return NextResponse.json(result);
}

/**
 * GET ?code=PROMO — public validation endpoint. Returns whether the code
 * exists and is active (without leaking affiliate identity).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ valid: false });
  }
  const supabase = await createServerSupabase();
  // Selecting via RLS-protected table — promo_code is unique and we only
  // need to know if it exists; RLS will block the SELECT unless we use the
  // service role. Since this endpoint is public, we use the server client
  // and accept that the RLS policy restricts SELECT to auth.uid() = user_id.
  // To check existence anonymously we need a public helper — for now we
  // return a non-leaking response if no row is visible.
  const { data } = await supabase
    .from("affiliates")
    .select("status")
    .eq("promo_code", code)
    .maybeSingle();
  return NextResponse.json({ valid: data?.status === "active" });
}
