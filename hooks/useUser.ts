"use client";

import type { User } from "@supabase/supabase-js";
import { useUserState } from "@/lib/hooks/useUserState";

export type UserPlan = "free" | "starter" | "pro" | null;

export interface UserState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  plan: UserPlan;
  onboardingCompleted: boolean;
}

/**
 * Thin convenience wrapper over `useUserState`. Exposes the shape expected by
 * landing/auth UI: plan normalised to 'free' | 'starter' | 'pro' | null.
 * Uses the project's existing @supabase/ssr context — do NOT swap to
 * @supabase/auth-helpers-nextjs (deprecated).
 */
export function useUser(): UserState {
  const { isLoading, user, profile, onboardingCompleted } = useUserState();

  let plan: UserPlan = null;
  if (user) {
    if (profile?.plan === "starter") plan = "starter";
    else if (profile?.plan === "pro") plan = "pro";
    else plan = "free";
  }

  return {
    isLoading,
    isAuthenticated: !!user,
    user,
    plan,
    onboardingCompleted,
  };
}
