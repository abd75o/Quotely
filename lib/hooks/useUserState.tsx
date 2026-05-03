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
  | "trial_active"
  | "trial_expired"
  | "subscribed_starter"
  | "subscribed_pro";

export interface UserProfile {
  id: string;
  plan: "trial" | "starter" | "pro" | null;
  trial_ends_at: string | null;
  subscription_cancel_at: string | null;
  subscription_current_period_end: string | null;
}

export interface UserStateContextValue {
  isLoading: boolean;
  state: UserStateValue;
  daysLeft: number | null;
  user: User | null;
  profile: UserProfile | null;
}

const DEFAULT_VALUE: UserStateContextValue = {
  isLoading: true,
  state: "visitor",
  daysLeft: null,
  user: null,
  profile: null,
};

const UserStateContext = createContext<UserStateContextValue>(DEFAULT_VALUE);

function computeState(
  user: User | null,
  profile: UserProfile | null
): UserStateContextValue {
  if (!user) {
    return {
      isLoading: false,
      state: "visitor",
      daysLeft: null,
      user: null,
      profile: null,
    };
  }

  if (profile?.plan === "starter") {
    return {
      isLoading: false,
      state: "subscribed_starter",
      daysLeft: null,
      user,
      profile,
    };
  }

  if (profile?.plan === "pro") {
    return {
      isLoading: false,
      state: "subscribed_pro",
      daysLeft: null,
      user,
      profile,
    };
  }

  // plan === "trial" or unknown — treat as trial
  if (profile?.trial_ends_at) {
    const remainingMs =
      new Date(profile.trial_ends_at).getTime() - Date.now();
    if (remainingMs <= 0) {
      return {
        isLoading: false,
        state: "trial_expired",
        daysLeft: 0,
        user,
        profile,
      };
    }
    const days = Math.max(1, Math.ceil(remainingMs / 86_400_000));
    return {
      isLoading: false,
      state: "trial_active",
      daysLeft: days,
      user,
      profile,
    };
  }

  // Logged in, no profile yet (handle_new_user trigger may not have run)
  return {
    isLoading: false,
    state: "trial_active",
    daysLeft: null,
    user,
    profile,
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
          "id, plan, trial_ends_at, subscription_cancel_at, subscription_current_period_end"
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

// ─── Plan-aware helpers (foundation pour la différenciation Starter / Pro) ──

export type EffectivePlan = "starter" | "pro" | null;

export interface UserPlanValue {
  isLoading: boolean;
  /** Plan effectif appliqué aux features. Pendant l'essai = "pro" (générosité). */
  plan: EffectivePlan;
  isStarter: boolean;
  isPro: boolean;
  isTrialing: boolean;
}

/**
 * Vue plan-aware du UserStateContext.
 * - Starter abonné → isStarter = true (limites Starter appliquées)
 * - Pro abonné OU en essai → isPro = true (toutes features débloquées)
 * - isTrialing dérivé de l'état trial_active
 */
export function useUserPlan(): UserPlanValue {
  const { isLoading, state } = useUserState();

  const isTrialing = state === "trial_active" || state === "trial_expired";
  const isStarter = state === "subscribed_starter";
  // Pendant l'essai, on traite l'utilisateur comme Pro pour ne pas brider
  // l'expérience découverte (sauf si l'essai a expiré).
  const isPro = state === "subscribed_pro" || state === "trial_active";

  let plan: EffectivePlan = null;
  if (isStarter) plan = "starter";
  else if (isPro) plan = "pro";

  return { isLoading, plan, isStarter, isPro, isTrialing };
}
