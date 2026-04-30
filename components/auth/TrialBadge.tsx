"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Star, Zap, X } from "lucide-react";

interface Props {
  trialEndsAt: string | null;
  plan: string;
}

export function TrialBadge({ trialEndsAt, plan }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // ── Plan payant actif ──────────────────────────────────────────────────────
  if (plan === "pro") {
    return (
      <div className="flex items-center gap-2 mx-3 mb-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-purple-600">
        <Star className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" fill="currentColor" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Plan Pro</p>
          <p className="text-[11px] text-indigo-200">Toutes les fonctionnalités</p>
        </div>
      </div>
    );
  }

  if (plan === "starter") {
    return (
      <div className="flex items-center gap-2 mx-3 mb-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
        <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-blue-700">Plan Starter</p>
          <p className="text-[11px] text-blue-500">
            <Link href="/tarifs" className="hover:underline cursor-pointer">
              Passer au Pro →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Essai en cours ─────────────────────────────────────────────────────────
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400_000))
    : 14;

  if (daysLeft <= 0) return null;

  const urgent = daysLeft <= 2;

  return (
    <Link
      href="/tarifs"
      className={`group flex items-center gap-2 mx-3 mb-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 ${
        urgent
          ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
          : "bg-[var(--primary-bg)] border-[var(--primary)]/20 hover:bg-indigo-100"
      }`}
    >
      <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${urgent ? "text-amber-500" : "text-[var(--primary)]"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${urgent ? "text-amber-700" : "text-[var(--primary)]"}`}>
          Essai Pro
        </p>
        <p className={`text-[11px] ${urgent ? "text-amber-600" : "text-indigo-500"}`}>
          {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setDismissed(true);
        }}
        aria-label="Masquer"
        className="p-0.5 rounded-full hover:bg-black/10 cursor-pointer transition-colors flex-shrink-0"
      >
        <X className="w-3 h-3 text-current opacity-60" />
      </button>
    </Link>
  );
}
