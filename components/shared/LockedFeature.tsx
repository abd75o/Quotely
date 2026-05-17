"use client";

import { Lock } from "lucide-react";
import {
  PLAN_FEATURES,
  getPlanFeatures,
  type Plan,
  type PlanFeatures,
} from "@/lib/permissions";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { cn } from "@/lib/utils";

export type LockedFeatureVariant = "overlay" | "replace" | "inline";

type RequiredPlan = Exclude<Plan, "free">;

export interface LockedTeaser {
  title?: string;
  description?: string;
  stats?: Array<{ label: string; value: string | number }>;
}

interface LockedFeatureProps {
  /** Permission key documented on `PLAN_FEATURES` (used for typing / docs). */
  feature: keyof PlanFeatures;
  /** Plan that unlocks the wrapped region — drives the upsell copy. */
  requiredPlan: RequiredPlan;
  variant?: LockedFeatureVariant;
  teaser?: LockedTeaser;
  children: React.ReactNode;
  className?: string;
}

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  comptable: 3,
};

function formatPrice(price: number): string {
  return Number.isFinite(price) ? `${price}€/mois` : "—";
}

function UpgradeCTA({ requiredPlan }: { requiredPlan: RequiredPlan }) {
  const f = getPlanFeatures(requiredPlan);
  return (
    <button
      type="button"
      disabled
      title="Bientôt disponible"
      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-sm opacity-70 cursor-not-allowed"
    >
      Passer au {f.label} · {formatPrice(f.price)} →
    </button>
  );
}

function TeaserBody({
  requiredPlan,
  teaser,
  compact = false,
}: {
  requiredPlan: RequiredPlan;
  teaser?: LockedTeaser;
  compact?: boolean;
}) {
  const f = getPlanFeatures(requiredPlan);
  const title = teaser?.title ?? `Disponible avec ${f.label}`;
  return (
    <div className="flex flex-col items-center gap-3 text-center max-w-md mx-auto">
      <div
        className={cn(
          "rounded-full bg-white border border-[var(--border)] shadow-md flex items-center justify-center",
          compact ? "w-9 h-9" : "w-11 h-11"
        )}
      >
        <Lock
          className={cn(
            "text-[var(--text-secondary)]",
            compact ? "w-4 h-4" : "w-5 h-5"
          )}
        />
      </div>
      <h3
        className={cn(
          "font-extrabold text-[var(--text-primary)] tracking-tight",
          compact ? "text-base" : "text-lg sm:text-xl"
        )}
      >
        {title}
      </h3>
      {teaser?.description && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {teaser.description}
        </p>
      )}
      {teaser?.stats && teaser.stats.length > 0 && (
        <ul
          className={cn(
            "grid w-full gap-2 mt-1",
            teaser.stats.length >= 3 ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          {teaser.stats.map((s) => (
            <li
              key={s.label}
              className="rounded-xl bg-white/80 backdrop-blur-sm border border-[var(--border)] px-3 py-2 text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {s.label}
              </p>
              <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                {s.value}
              </p>
            </li>
          ))}
        </ul>
      )}
      <UpgradeCTA requiredPlan={requiredPlan} />
    </div>
  );
}

/**
 * Locks a UI region behind a paid plan.
 *
 * - `overlay` : children blurred, teaser card centered on top.
 * - `replace` : children removed, replaced by a compact unlock card.
 * - `inline`  : children removed; renders a slim pill that opens the upgrade modal.
 */
export function LockedFeature({
  feature,
  requiredPlan,
  variant = "overlay",
  teaser,
  children,
  className,
}: LockedFeatureProps) {
  const { plan, isLoading } = useUserPlan();
  const { showUpgradeModal } = useUpgradeModal();

  // Optimistic render while resolving — avoids "locked then unlocked" flash.
  if (isLoading) return <>{children}</>;

  const userRank = PLAN_RANK[plan ?? "free"];
  const requiredRank = PLAN_RANK[requiredPlan];
  if (userRank >= requiredRank) return <>{children}</>;

  if (variant === "inline") {
    const f = getPlanFeatures(requiredPlan);
    return (
      <button
        type="button"
        onClick={() =>
          showUpgradeModal(
            teaser?.title ?? `Disponible avec ${f.label}`,
            teaser?.description ??
              `Cette fonctionnalité est incluse dans le plan ${f.label} (${formatPrice(f.price)}).`
          )
        }
        title={`Disponible avec ${f.label}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-gray-200 cursor-pointer transition-colors",
          className
        )}
        aria-label={`Disponible avec ${f.label} — voir l'upgrade`}
      >
        <Lock className="w-3 h-3" />
        <span aria-hidden>{feature ? "" : ""}</span>
        Disponible avec {f.label}
      </button>
    );
  }

  if (variant === "replace") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8",
          className
        )}
      >
        <TeaserBody requiredPlan={requiredPlan} teaser={teaser} compact />
      </div>
    );
  }

  return (
    <div className={cn("relative isolate", className)}>
      <div
        aria-hidden
        className="pointer-events-none select-none"
        style={{ filter: "blur(6px)", opacity: 0.4 }}
      >
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-[var(--border)] shadow-[var(--shadow-lg)] p-6 sm:p-8 max-w-md w-full">
          <TeaserBody requiredPlan={requiredPlan} teaser={teaser} />
        </div>
      </div>
    </div>
  );
}

export { PLAN_FEATURES };
