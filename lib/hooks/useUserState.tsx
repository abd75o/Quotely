"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  PLAN_FEATURES,
  getPlanFeatures,
  type Plan,
  type PlanFeatures,
} from "@/lib/permissions";

export type UserStateValue =
  | "visitor"
  | "subscribed_free"
  | "subscribed_starter"
  | "subscribed_pro"
  // Deprecated — kept for backward compat with components that still
  // reference these. They are never returned for new users.
  | "trial_active"
  | "trial_expired";

export interface UserProfile {
  id: string;
  /** 'trial' is legacy — kept in the union so historic rows still type-check. */
  plan: "free" | "trial" | "starter" | "pro" | "comptable" | null;
  subscription_status: "active" | "canceled" | "past_due" | null;
  /** @deprecated populated only on legacy rows; new signups leave it null. */
  trial_ends_at: string | null;
  onboarded_at: string | null;
  subscription_cancel_at: string | null;
  subscription_current_period_end: string | null;
}

export interface UserStateContextValue {
  isLoading: boolean;
  state: UserStateValue;
  daysLeft: number | null;
  user: User | null;
  profile: UserProfile | null;
  onboardingCompleted: boolean;
}

const DEFAULT_VALUE: UserStateContextValue = {
  isLoading: true,
  state: "visitor",
  daysLeft: null,
  user: null,
  profile: null,
  onboardingCompleted: false,
};

const UserStateContext = createContext<UserStateContextValue>(DEFAULT_VALUE);

function computeState(
  user: User | null,
  profile: UserProfile | null
): UserStateContextValue {
  if (!user) {
    return { ...DEFAULT_VALUE, isLoading: false };
  }

  const onboardingCompleted = !!profile?.onboarded_at;

  if (profile?.plan === "starter") {
    return {
      isLoading: false,
      state: "subscribed_starter",
      daysLeft: null,
      user,
      profile,
      onboardingCompleted,
    };
  }

  if (profile?.plan === "pro") {
    return {
      isLoading: false,
      state: "subscribed_pro",
      daysLeft: null,
      user,
      profile,
      onboardingCompleted,
    };
  }

  // 'free', legacy 'trial', null, or missing profile → Free plan.
  return {
    isLoading: false,
    state: "subscribed_free",
    daysLeft: null,
    user,
    profile,
    onboardingCompleted,
  };
}

export function UserStateProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<UserStateContextValue>(DEFAULT_VALUE);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setValue(computeState(null, null));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id, plan, subscription_status, trial_ends_at, onboarded_at, subscription_cancel_at, subscription_current_period_end"
        )
        .eq("id", user.id)
        .single();

      if (cancelled) return;
      setValue(computeState(user, (profile as UserProfile | null) ?? null));
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserStateContext.Provider value={value}>
      {children}
    </UserStateContext.Provider>
  );
}

export function useUserState() {
  return useContext(UserStateContext);
}

// ─── Plan-aware helpers ──────────────────────────────────────────────────────

export type EffectivePlan = Plan | null;

export interface UserPlanValue {
  isLoading: boolean;
  /** Resolved plan, or `null` while loading / when no user is signed in. */
  plan: EffectivePlan;
  /** Resolved permissions matrix (always defined — defaults to Free). */
  features: PlanFeatures;
  isFree: boolean;
  isStarter: boolean;
  isPro: boolean;
  /** Devis created by this user since the 1st of the current month. */
  monthlyQuotesUsed: number;
  /** Monthly quota for the resolved plan (Infinity for Comptable). */
  monthlyQuotesLimit: number;
  /** `monthlyQuotesLimit - monthlyQuotesUsed`, floored at 0. */
  remainingQuotes: number;
  /** `true` while the user still has room under the monthly quota. */
  canCreateNewQuote: boolean;
  /** @deprecated trial concept removed; always false. */
  isTrialing: boolean;
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useUserPlan(): UserPlanValue {
  const { isLoading: stateLoading, state, user } = useUserState();

  const isFree = state === "subscribed_free";
  const isStarter = state === "subscribed_starter";
  const isPro = state === "subscribed_pro";

  let plan: EffectivePlan = null;
  if (isStarter) plan = "starter";
  else if (isPro) plan = "pro";
  else if (isFree) plan = "free";

  const features = getPlanFeatures(plan);

  const [monthlyQuotesUsed, setMonthlyQuotesUsed] = useState(0);
  const [quotesLoading, setQuotesLoading] = useState(true);

  useEffect(() => {
    if (stateLoading) return;
    if (!user) {
      setMonthlyQuotesUsed(0);
      setQuotesLoading(false);
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);
    (async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonthIso());
      if (cancelled) return;
      setMonthlyQuotesUsed(count ?? 0);
      setQuotesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stateLoading, user]);

  const monthlyQuotesLimit = features.maxDevisPerMonth;
  const remainingQuotes = Number.isFinite(monthlyQuotesLimit)
    ? Math.max(0, monthlyQuotesLimit - monthlyQuotesUsed)
    : Number.POSITIVE_INFINITY;
  const canCreateNewQuote = !Number.isFinite(monthlyQuotesLimit)
    ? true
    : monthlyQuotesUsed < monthlyQuotesLimit;

  return {
    isLoading: stateLoading || quotesLoading,
    plan,
    features,
    isFree,
    isStarter,
    isPro,
    monthlyQuotesUsed,
    monthlyQuotesLimit,
    remainingQuotes,
    canCreateNewQuote,
    isTrialing: false,
  };
}

export { PLAN_FEATURES };
