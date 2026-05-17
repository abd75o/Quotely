// Attribute a newly-signed-up user to an affiliate (cookie `qv_ref`) and/or
// a referrer (cookie `qv_parrain`). Called from /auth/callback after the
// session is established. Uses the service_role client so it can write to
// affiliate_referrals / referrals across users.

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const REF_COOKIE = "qv_ref";
export const PARRAIN_COOKIE = "qv_parrain";

interface AttributeArgs {
  userId: string;
  refCode?: string | null;
  parrainCode?: string | null;
}

interface AttributeResult {
  affiliateAttributed: boolean;
  parrainageAttributed: boolean;
  errors: string[];
}

/**
 * Idempotent: relies on the UNIQUE(referred_user_id) / UNIQUE(referred_id)
 * constraints to silently skip duplicate attribution (e.g. user re-confirms
 * email twice).
 */
export async function attributeNewUser({
  userId,
  refCode,
  parrainCode,
}: AttributeArgs): Promise<AttributeResult> {
  const supabase = getSupabaseAdmin();
  const errors: string[] = [];
  let affiliateAttributed = false;
  let parrainageAttributed = false;

  if (refCode) {
    try {
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, duration_months, status")
        .eq("promo_code", refCode)
        .maybeSingle();

      if (affiliate && affiliate.status === "active") {
        const { error } = await supabase.from("affiliate_referrals").insert({
          affiliate_id: affiliate.id,
          referred_user_id: userId,
          promo_code_used: refCode,
          months_remaining_commission: affiliate.duration_months ?? 12,
          status: "active",
        });
        // 23505 = unique_violation → already attributed, treat as success.
        if (!error || error.code === "23505") {
          affiliateAttributed = true;
        } else {
          errors.push(`affiliate_referrals: ${error.message}`);
        }
      }
    } catch (e) {
      errors.push(`affiliate attribution: ${(e as Error).message}`);
    }
  }

  if (parrainCode) {
    try {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id, referral_code")
        .eq("referral_code", parrainCode)
        .maybeSingle();

      // Self-referral guard.
      if (referrer && referrer.id !== userId) {
        const { error } = await supabase.from("referrals").insert({
          referrer_id: referrer.id,
          referred_id: userId,
          referrer_code: parrainCode,
          status: "pending",
        });
        if (!error || error.code === "23505") {
          parrainageAttributed = true;
        } else {
          errors.push(`referrals: ${error.message}`);
        }
      }
    } catch (e) {
      errors.push(`parrainage attribution: ${(e as Error).message}`);
    }
  }

  return { affiliateAttributed, parrainageAttributed, errors };
}
