import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanFeatures, type Plan } from "@/lib/permissions";

/**
 * Server-side monthly quote cap — the enforcement counterpart of the UI gate in
 * `lib/hooks/useUserState.tsx` (useUserPlan). Until now the per-plan limits
 * (Free 5 / Starter 30 / Pro 100 / Comptable ∞) were only checked client-side,
 * so a raw API call could bypass them and run up unbounded Anthropic cost.
 *
 * Single source of truth for the numbers: `lib/permissions.ts` PLAN_FEATURES.
 * Counting logic mirrors the client exactly (count of `quotes` rows created
 * since the 1st of the current month). Because deletions are hard DELETEs, a
 * deleted draft naturally drops out of the count — quota frees up again.
 *
 * Call ONLY on quote CREATION paths (insert). Never on updates: editing an
 * existing devis must never be blocked or consume extra quota.
 */

function startOfMonthIso(): string {
  // Same computation as the client (lib/hooks/useUserState startOfMonthIso):
  // 1st of the current month at 00:00 in the runtime's local time. On the
  // server (Netlify) that's UTC; close enough for a monthly cap and keeps the
  // two implementations in lockstep.
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface QuoteUsage {
  plan: Plan;
  /** Devis created since the 1st of the current month (status-agnostic). */
  used: number;
  /** Number.POSITIVE_INFINITY for the Comptable tier. */
  limit: number;
  /** true if a read errored — callers should fail OPEN (don't block). */
  degraded: boolean;
}

export interface QuotaCheck {
  ok: boolean;
  plan: Plan;
  used: number;
  limit: number;
  /** Set only when ok === false. User-facing French message. */
  error?: string;
}

/**
 * THE single source for "how many devis has this user created this month".
 * Used by BOTH the server cap (checkMonthlyQuoteQuota) and the UI counter
 * (GET via the devis page), so the badge can NEVER diverge from the cap.
 *
 * Counts `quotes` rows by `created_at` (status-agnostic) — i.e. every devis
 * GENERATED this month (drafts included), never "signed only", never
 * conversations. Hard DELETEs drop out of the count and free quota back up.
 */
export async function getMonthlyQuoteUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuoteUsage> {
  let degraded = false;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) {
    console.error("[quota] profile.plan read failed:", profileErr);
    degraded = true;
  }
  const plan = ((profile?.plan as Plan | null) ?? "free") as Plan;
  const limit = getPlanFeatures(plan).maxDevisPerMonth;

  const { count, error: countErr } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonthIso());
  if (countErr) {
    console.error("[quota] monthly count failed:", countErr);
    degraded = true;
  }

  return { plan, used: count ?? 0, limit, degraded };
}

/**
 * Returns { ok: false, error } when the user has reached their monthly cap.
 *
 * Fails OPEN (allows creation) on any read error (`degraded`): a transient DB
 * glitch must not lock a paying artisan out. The abuse vector we defend against
 * (a Free user scripting unlimited devis) goes through the happy path where
 * both reads succeed and the cap is enforced.
 */
export async function checkMonthlyQuoteQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuotaCheck> {
  const { plan, used, limit, degraded } = await getMonthlyQuoteUsage(
    supabase,
    userId,
  );

  // Fail-open on a read error, or unlimited tier → never block.
  if (degraded || !Number.isFinite(limit)) {
    return { ok: true, plan, used, limit };
  }

  if (used >= limit) {
    return {
      ok: false,
      plan,
      used,
      limit,
      error: `Limite atteinte : ton offre ${getPlanFeatures(plan).label} permet ${limit} devis par mois (tu en as déjà ${used} ce mois-ci). Passe à une offre supérieure pour en créer davantage.`,
    };
  }
  return { ok: true, plan, used, limit };
}
