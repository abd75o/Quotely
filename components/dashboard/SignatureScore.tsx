"use client";

import { useState } from "react";
import { Award, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureScoreProps {
  /** Score 0-100. Si non fourni, fallback démo (78). */
  score?: number;
  className?: string;
}

// TODO Phase 2 — calcul réel :
//   - taux de signature des 30 derniers devis (signed / sent)
//   - pondéré par délai moyen avant signature (plus c'est rapide, mieux c'est)
//   - bonus si client a un téléphone renseigné, etc.
//   - benchmark "X% mieux que la moyenne" via une vue agrégée Supabase
const PLACEHOLDER_SCORE = 78;
const PLACEHOLDER_BENCHMARK = 12; // % au-dessus de la moyenne

function colorForScore(score: number): { bar: string; text: string; bg: string; ring: string } {
  if (score <= 40) return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50", ring: "ring-red-200" };
  if (score <= 70) return { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" };
  return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" };
}

export function SignatureScore({ score, className }: SignatureScoreProps) {
  const value = Math.max(0, Math.min(100, score ?? PLACEHOLDER_SCORE));
  const colors = colorForScore(value);
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <section
      className={cn(
        "bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6",
        className
      )}
      aria-label="Score moyen de signature"
    >
      <div className="flex items-start gap-4">
        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0", colors.bg)}>
          <Award className={cn("w-5 h-5", colors.text)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Score de signature</h2>
            <button
              type="button"
              onMouseEnter={() => setTipOpen(true)}
              onMouseLeave={() => setTipOpen(false)}
              onFocus={() => setTipOpen(true)}
              onBlur={() => setTipOpen(false)}
              onClick={() => setTipOpen((v) => !v)}
              aria-label="En savoir plus sur le score"
              className="relative text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {tipOpen && (
                <span
                  role="tooltip"
                  className="absolute left-1/2 -translate-x-1/2 top-5 z-10 w-56 p-2.5 text-xs font-normal normal-case tracking-normal text-left text-white bg-[var(--text-primary)] rounded-lg shadow-lg"
                >
                  Calculé sur vos 30 derniers devis envoyés. Plus le score est haut, plus vos devis se signent rapidement.
                </span>
              )}
            </button>
          </div>

          <div className="flex items-baseline gap-2 mb-2.5">
            <span className={cn("text-3xl font-extrabold tabular-nums", colors.text)}>{value}</span>
            <span className="text-sm font-semibold text-[var(--text-muted)]">/100</span>
          </div>

          <div
            className={cn("h-2 rounded-full bg-[var(--surface)] overflow-hidden ring-1", colors.ring)}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Score de signature ${value} sur 100`}
          >
            <div
              className={cn("h-full transition-all duration-700 rounded-full", colors.bar)}
              style={{ width: `${value}%` }}
            />
          </div>

          <p className="mt-2.5 text-xs text-[var(--text-secondary)]">
            Vos devis sont{" "}
            <span className="font-semibold text-[var(--text-primary)]">{PLACEHOLDER_BENCHMARK}%</span>{" "}
            plus signés que la moyenne.
          </p>
        </div>
      </div>
    </section>
  );
}
