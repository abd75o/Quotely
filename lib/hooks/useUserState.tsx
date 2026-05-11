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
  plan: "free" | "trial" | "starter" | "pro" | null;
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
          "id, plan, trial_ends_at, onboarded_at, subscription_cancel_at, subscription_current_period_end"
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

export type EffectivePlan = "free" | "starter" | "pro" | null;

export interface UserPlanValue {
  isLoading: boolean;
  plan: EffectivePlan;
  isFree: boolean;
  isStarter: boolean;
  isPro: boolean;
  /** @deprecated trial concept removed; always false. */
  isTrialing: boolean;
}

export function useUserPlan(): UserPlanValue {
  const { isLoading, state } = useUserState();

  const isFree = state === "subscribed_free";
  const isStarter = state === "subscribed_starter";
  const isPro = state === "subscribed_pro";

  let plan: EffectivePlan = null;
  if (isStarter) plan = "starter";
  else if (isPro) plan = "pro";
  else if (isFree) plan = "free";

  return { isLoading, plan, isFree, isStarter, isPro, isTrialing: false };
}
