/**
 * Centralised plan/permission matrix for the Quovi freemium model.
 *
 * The 14-day trial was retired in May 2026 — every new signup starts on `free`.
 * The `comptable` plan is reserved for a future cabinet tier; its config
 * exists so the architecture can accept it without further refactors.
 */

export type Plan = "free" | "starter" | "pro" | "comptable";

export interface PlanFeatures {
  label: string;
  price: number;
  maxDevisPerMonth: number;
  maxClients: number;
  canUseOnlineSignature: boolean;
  canUseOTPSignature: boolean;
  canUseIris: boolean;
  canUseAdvancedStats: boolean;
  canExportCSV: boolean;
  canUseClientTags: boolean;
  canUseRevenueChart: boolean;
  canUsePriceMemory: boolean;
  showWatermark: boolean;
  /** Quote history visible to the user (in days). Infinity = unlimited. */
  historyLimitDays: number;
  supportLevel: "email_48h" | "email_24h" | "priority";
  nextUpgrade: Plan | null;
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  free: {
    label: "Free",
    price: 0,
    maxDevisPerMonth: 5,
    maxClients: Number.POSITIVE_INFINITY,
    canUseOnlineSignature: true,
    canUseOTPSignature: false,
    canUseIris: false,
    canUseAdvancedStats: false,
    canExportCSV: false,
    canUseClientTags: false,
    canUseRevenueChart: false,
    canUsePriceMemory: true,
    showWatermark: false,
    historyLimitDays: 30,
    supportLevel: "email_48h",
    nextUpgrade: "starter",
  },
  starter: {
    label: "Starter",
    price: 25,
    maxDevisPerMonth: 30,
    maxClients: Number.POSITIVE_INFINITY,
    canUseOnlineSignature: true,
    canUseOTPSignature: false,
    canUseIris: false,
    canUseAdvancedStats: false,
    canExportCSV: false,
    canUseClientTags: false,
    canUseRevenueChart: false,
    canUsePriceMemory: true,
    showWatermark: false,
    historyLimitDays: Number.POSITIVE_INFINITY,
    supportLevel: "email_24h",
    nextUpgrade: "pro",
  },
  pro: {
    label: "Pro",
    price: 49,
    maxDevisPerMonth: 100,
    maxClients: Number.POSITIVE_INFINITY,
    canUseOnlineSignature: true,
    canUseOTPSignature: true,
    canUseIris: true,
    canUseAdvancedStats: true,
    canExportCSV: true,
    canUseClientTags: true,
    canUseRevenueChart: true,
    canUsePriceMemory: true,
    showWatermark: false,
    historyLimitDays: Number.POSITIVE_INFINITY,
    supportLevel: "priority",
    nextUpgrade: null,
  },
  comptable: {
    label: "Comptable",
    price: 99,
    maxDevisPerMonth: Number.POSITIVE_INFINITY,
    maxClients: Number.POSITIVE_INFINITY,
    canUseOnlineSignature: true,
    canUseOTPSignature: true,
    canUseIris: true,
    canUseAdvancedStats: true,
    canExportCSV: true,
    canUseClientTags: true,
    canUseRevenueChart: true,
    canUsePriceMemory: true,
    showWatermark: false,
    historyLimitDays: Number.POSITIVE_INFINITY,
    supportLevel: "priority",
    nextUpgrade: null,
  },
};

export type BooleanFeatureKey = {
  [K in keyof PlanFeatures]: PlanFeatures[K] extends boolean ? K : never;
}[keyof PlanFeatures];

export function getPlanFeatures(plan: Plan | null | undefined): PlanFeatures {
  if (!plan) return PLAN_FEATURES.free;
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
}
