// Returns the authenticated user's parrainage stats: their referral_code
// (auto-generated on first hit if missing), the list of pending/converted
// referrals, and total months gained.

import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateReferralCode } from "@/lib/affiliates/code";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, referral_credits_months, first_name")
    .eq("id", user.id)
    .maybeSingle();

  // Lazy-generate the code on first visit. Try up to 3 times in the rare
  // case of a collision against the UNIQUE constraint.
  if (profile && !profile.referral_code) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = generateReferralCode(profile.first_name);
      const { error } = await getSupabaseAdmin()
        .from("profiles")
        .update({ referral_code: candidate })
        .eq("id", user.id);
      if (!error) {
        profile = { ...profile, referral_code: candidate };
        break;
      }
      // 23505 = unique_violation → retry with a new random suffix.
      if (error.code !== "23505") break;
    }
  }

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, referred_id, status, first_payment_date, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const list = referrals ?? [];
  const counts = {
    pending: list.filter((r) => r.status === "pending").length,
    converted: list.filter((r) => r.status === "converted").length,
    rewarded: list.filter((r) => r.status === "rewarded").length,
    total: list.length,
  };

  return NextResponse.json({
    referral_code: profile?.referral_code ?? null,
    referral_credits_months: profile?.referral_credits_months ?? 0,
    referrals: list,
    counts,
  });
}
