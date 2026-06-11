"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, Eye, Mail, Pause, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface PendingItem {
  id: string;
  number: string;
  clientName: string;
  total: number;
  daysSince: number;
  nextRelance: "J+3" | "J+7" | "J+14";
  pageViewedAt: string | null;
}

// « Vu le 9 juin à 14:30 » — date courte (cf. recentActivity) + heure (cf. page
// de signature). Pas d'année : un devis surveillé a ≤ 14 jours.
function formatViewedAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Vu le ${date} à ${time}`;
}

interface ActivityItem {
  id: string;
  date: string;
  message: string;
}

interface IrisDashboardProps {
  pendingItems: PendingItem[];
  remindersSentThisMonth: number;
  signedThanksToIris: number;
  successRate: number;
  recentActivity: ActivityItem[];
  irisEnabled: boolean;
}

export function IrisDashboard({
  pendingItems,
  remindersSentThisMonth,
  signedThanksToIris,
  successRate,
  recentActivity,
  irisEnabled,
}: IrisDashboardProps) {
  const [enabled, setEnabled] = useState(irisEnabled);
  const [saving, setSaving] = useState(false);

  async function toggleIris() {
    const next = !enabled;
    setSaving(true);
    // Optimiste : on bascule tout de suite, on annule si l'API échoue.
    setEnabled(next);
    try {
      const res = await fetch("/api/iris/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(next ? "Iris activée ✓" : "Iris mise en pause");
    } catch (e) {
      console.error("[IRIS toggle]", e);
      setEnabled(!next);
      toast.error("Impossible de mettre à jour Iris — réessaie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/dashboard/equipe"
        className="inline-flex items-center gap-1.5 mb-3 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour à l&apos;équipe
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Iris
            {enabled ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                En pause
              </span>
            )}
          </span>
        }
        subtitle="Ta sentinelle automatique — relance, surveille, signe."
      />

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatTile
          icon={Send}
          color="indigo"
          label="Relances envoyées"
          value={remindersSentThisMonth}
          sub="Ce mois-ci"
        />
        <StatTile
          icon={CheckCircle2}
          color="emerald"
          label="Devis signés via Iris"
          value={signedThanksToIris}
        />
        <StatTile
          icon={Bell}
          color="amber"
          label="Taux de réussite"
          value={`${successRate}%`}
        />
      </section>

      {/* Activité en cours */}
      <section className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] mb-6 overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Eye className="w-4 h-4 text-[var(--primary)]" />
            Devis surveillés
          </h2>
          {pendingItems.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {pendingItems.length}
            </span>
          )}
        </header>
        {pendingItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Tout est sous contrôle 🎉"
            description="Aucun devis ne nécessite de surveillance active."
          />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {pendingItems.map((q) => (
              <li
                key={q.id}
                className="flex items-stretch gap-3 px-4 sm:px-5 py-3.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {q.clientName}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {q.number} · {q.total.toLocaleString("fr-FR")} € · en attente depuis{" "}
                    {q.daysSince} jour{q.daysSince > 1 ? "s" : ""}
                  </p>
                  {/* Statut de vue : page_viewed_at = ouverture réelle de /sign. */}
                  {q.pageViewedAt ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <Eye className="w-3 h-3 shrink-0" />
                      {formatViewedAt(q.pageViewedAt)}
                    </p>
                  ) : (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                      <Eye className="w-3 h-3 shrink-0 opacity-50" />
                      Pas encore ouvert
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end justify-between shrink-0">
                  <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-bg)] text-[var(--primary)] border border-[var(--primary)]/20">
                    Prochaine : {q.nextRelance}
                  </span>
                  <button
                    type="button"
                    disabled
                    title="Bientôt disponible"
                    className="mt-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] bg-white border border-[var(--border)] rounded-lg opacity-60 cursor-not-allowed"
                  >
                    <Pause className="w-3 h-3" />
                    Pause
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Activité historique */}
      <section className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] mb-6 p-5 sm:p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-[var(--primary)]" />
          Historique des relances
        </h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Aucune action récente — Iris attend ses premiers devis à relancer.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="text-[11px] font-bold text-[var(--text-muted)] tabular-nums whitespace-nowrap mt-0.5">
                  {a.date}
                </span>
                <span className="text-[var(--text-secondary)] leading-snug">{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Réglages */}
      <section className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-5 sm:p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Réglages d&apos;Iris</h2>

        {/* Toggle ON/OFF */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 mb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Relances automatiques
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {enabled
                ? "Iris relance tes devis envoyés non signés (J+3 · J+7 · J+14)."
                : "En pause — Iris n'envoie aucune relance."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Activer ou mettre Iris en pause"
            onClick={toggleIris}
            disabled={saving}
            className={cn(
              "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
              enabled ? "bg-[var(--primary)]" : "bg-gray-300",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform",
                enabled ? "translate-x-[22px]" : "translate-x-0.5",
              )}
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin text-[var(--primary)]" />}
            </span>
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-4">
          La personnalisation des délais et du ton arrive très prochainement.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
            <p className="font-bold text-[var(--text-primary)]">J+3</p>
            <p className="text-[var(--text-muted)]">Relance douce</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
            <p className="font-bold text-[var(--text-primary)]">J+7</p>
            <p className="text-[var(--text-muted)]">Relance ferme</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
            <p className="font-bold text-[var(--text-primary)]">J+14</p>
            <p className="text-[var(--text-muted)]">Dernière relance</p>
          </div>
        </div>
      </section>
    </div>
  );
}
