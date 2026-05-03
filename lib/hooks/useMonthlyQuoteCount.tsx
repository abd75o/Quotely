"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserPlan } from "@/lib/hooks/useUserState";

export const STARTER_MONTHLY_LIMIT = 30;

export interface MonthlyQuoteCountValue {
  isLoading: boolean;
  count: number;
  /** Number.POSITIVE_INFINITY pour Pro / essai. */
  limit: number;
  remaining: number;
  isLimitReached: boolean;
  refresh: () => void;
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Compte les devis créés par l'utilisateur courant depuis le 1er du mois.
 * Limite = 30 pour Starter, infinie pour Pro / essai.
 */
export function useMonthlyQuoteCount(): MonthlyQuoteCountValue {
  const { isStarter, isLoading: planLoading } = useUserPlan();
  const limit = isStarter ? STARTER_MONTHLY_LIMIT : Number.POSITIVE_INFINITY;

  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (planLoading) return;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setCount(0);
          setIsLoading(false);
        }
        return;
      }
      const { count: c } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonthIso());
      if (cancelled) return;
      setCount(c ?? 0);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [planLoading, tick]);

  const remaining = Number.isFinite(limit) ? Math.max(0, limit - count) : Number.POSITIVE_INFINITY;
  const isLimitReached = Number.isFinite(limit) && count >= limit;

  return {
    isLoading: planLoading || isLoading,
    count,
    limit,
    remaining,
    isLimitReached,
    refresh: () => setTick((t) => t + 1),
  };
}
