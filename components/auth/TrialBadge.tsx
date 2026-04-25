"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  trialEndsAt: string | null;
  plan: string;
}

export function TrialBadge({ trialEndsAt, plan }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || plan !== "trial" || !trialEndsAt) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400_000)
  );

  if (daysLeft <= 0) return null;

  const urgent = daysLeft <= 3;

  return (
    <Link
      href="/dashboard/settings/billing"
      className={cn(
        "group flex items-center gap-2 mx-3 mb-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150",
        urgent
          ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
          : "bg-[var(--primary-bg)] border-[var(--primary)]/20 hover:bg-indigo-100"
      )}
    >
      <Sparkles className={cn("w-3.5 h-3.5 flex-shrink-0", urgent ? "text-amber-500" : "text-[var(--primary)]")} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold", urgent ? "text-amber-700" : "text-[var(--primary)]")}>
          Essai Pro
        </p>
        <p className={cn("text-[11px]", urgent ? "text-amber-600" : "text-indigo-500")}>
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
