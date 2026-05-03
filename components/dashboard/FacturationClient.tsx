"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useUserState, useUserPlan } from "@/lib/hooks/useUserState";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface InvoiceRow {
  id: string;
  number: string | null;
  created: number;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export function FacturationClient() {
  const { state, daysLeft } = useUserState();
  const { isStarter, isPro, isTrialing } = useUserPlan();
  const { showUpgradeModal } = useUpgradeModal();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stripe/invoices");
        if (!res.ok) {
          if (!cancelled) setInvoices([]);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setInvoices(data.invoices ?? []);
      } catch {
        if (!cancelled) setInvoices([]);
      } finally {
        if (!cancelled) setLoadingInvoices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openStripePortal() {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || res.status === 501) {
        toastInfo(data.message ?? "Disponible bientôt");
        return;
      }
      if (!res.ok || !data.url) {
        toastError("Impossible d'ouvrir le portail. Réessayez.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toastError("Erreur réseau. Réessayez.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Plan actuel */}
      <PlanCard
        state={state}
        daysLeft={daysLeft}
        isStarter={isStarter}
        isPro={isPro}
        isTrialing={isTrialing}
        onUpgradeProClick={() =>
          showUpgradeModal(
            "Plan Pro",
            "Passez au Pro pour débloquer la dictée vocale, l'IA, les relances automatiques et les devis illimités.",
            Sparkles
          )
        }
      />

      {/* Méthode de paiement */}
      <Section title="Méthode de paiement">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface)] flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {isPro || isStarter ? "Carte bancaire enregistrée" : "Aucune carte enregistrée"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Gérez votre carte directement sur le portail sécurisé Stripe.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openStripePortal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-[var(--surface)] rounded-xl cursor-pointer transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ouvrir le portail Stripe
        </button>
      </Section>

      {/* Historique factures */}
      <Section title="Historique des factures">
        {loadingInvoices ? (
          <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Aucune facture pour le moment
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Vos factures apparaîtront ici après votre premier paiement.
            </p>
          </div>
        ) : (
          <InvoicesTable invoices={invoices} />
        )}
      </Section>

      {/* Zone dangereuse */}
      {(isStarter || isPro) && !isTrialing && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-700">Annuler mon abonnement</h2>
              <p className="text-xs text-red-700/80 mt-0.5 leading-relaxed">
                Votre accès aux fonctionnalités sera maintenu jusqu&apos;à la fin de la période en cours.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmCancelOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-100 rounded-xl cursor-pointer transition-colors"
          >
            Annuler mon abonnement
          </button>
        </section>
      )}

      {confirmCancelOpen && (
        <CancelConfirmModal
          onClose={() => setConfirmCancelOpen(false)}
          onConfirm={async (reason) => {
            try {
              const res = await fetch("/api/stripe/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
              });
              const data = await res.json().catch(() => ({}));
              if (res.status === 409 || res.status === 501) {
                toastInfo(data.message ?? "Disponible bientôt");
                return;
              }
              if (!res.ok) {
                toastError("Annulation impossible. Réessayez.");
                return;
              }
              toastSuccess("Abonnement annulé. Accès maintenu jusqu'à la fin de la période.");
              setConfirmCancelOpen(false);
            } catch {
              toastError("Erreur réseau. Réessayez.");
            }
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6">
      <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PlanCard({
  state,
  daysLeft,
  isStarter,
  isPro,
  isTrialing,
  onUpgradeProClick,
}: {
  state: ReturnType<typeof useUserState>["state"];
  daysLeft: number | null;
  isStarter: boolean;
  isPro: boolean;
  isTrialing: boolean;
  onUpgradeProClick: () => void;
}) {
  let badge = "Plan inconnu";
  let title = "Choisissez un plan pour démarrer";
  let subtitle = "";
  let action: React.ReactNode = null;

  if (state === "trial_active") {
    badge = "Essai en cours";
    title = "Vous testez actuellement le plan Pro pendant 14 jours.";
    subtitle = `Il vous reste ${daysLeft ?? 14} jour${(daysLeft ?? 14) > 1 ? "s" : ""} d'essai.`;
    action = (
      <a
        href="/tarifs"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
      >
        Choisir mon plan
      </a>
    );
  } else if (state === "trial_expired") {
    badge = "Essai expiré";
    title = "Votre essai gratuit est terminé.";
    subtitle = "Choisissez un plan pour reprendre votre activité.";
    action = (
      <a
        href="/tarifs"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
      >
        Choisir mon plan
      </a>
    );
  } else if (isStarter) {
    badge = "Plan Starter · 25 €/mois";
    title = "Vous êtes sur le plan Starter.";
    subtitle = "Passez au Pro pour débloquer toutes les fonctionnalités avancées.";
    action = (
      <button
        type="button"
        onClick={onUpgradeProClick}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
      >
        Passer au Pro
      </button>
    );
  } else if (isPro && !isTrialing) {
    badge = "Plan Pro · 49 €/mois";
    title = "Vous êtes sur le plan Pro.";
    subtitle = "Toutes les fonctionnalités sont débloquées.";
    action = (
      <a
        href="/tarifs"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-[var(--surface)] rounded-xl cursor-pointer transition-colors"
      >
        Repasser à Starter
      </a>
    );
  }

  return (
    <section className="bg-gradient-to-br from-[var(--primary)] to-indigo-700 text-white rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-widest mb-3">
        <Sparkles className="w-3 h-3" />
        {badge}
      </div>
      <h2 className="text-lg sm:text-xl font-bold leading-tight mb-1">{title}</h2>
      {subtitle && <p className="text-sm text-white/80 mb-4">{subtitle}</p>}
      {action}
    </section>
  );
}

function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
            <tr>
              <th className="text-left font-semibold uppercase tracking-wider text-xs px-4 py-2.5">
                Date
              </th>
              <th className="text-left font-semibold uppercase tracking-wider text-xs px-4 py-2.5">
                N°
              </th>
              <th className="text-left font-semibold uppercase tracking-wider text-xs px-4 py-2.5">
                Montant
              </th>
              <th className="text-left font-semibold uppercase tracking-wider text-xs px-4 py-2.5">
                Statut
              </th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-[var(--surface)]">
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {new Date(inv.created * 1000).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                  {inv.number ?? "—"}
                </td>
                <td className="px-4 py-3 font-bold text-[var(--text-primary)] tabular-nums">
                  {(inv.amount_paid / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: inv.currency.toUpperCase(),
                  })}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={inv.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {inv.invoice_pdf ? (
                    <a
                      href={inv.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden flex flex-col gap-2.5">
        {invoices.map((inv) => (
          <li
            key={inv.id}
            className="rounded-xl border border-[var(--border)] p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)]">
                {new Date(inv.created * 1000).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                {(inv.amount_paid / 100).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: inv.currency.toUpperCase(),
                })}
              </p>
              <StatusPill status={inv.status} />
            </div>
            {inv.invoice_pdf && (
              <a
                href={inv.invoice_pdf}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Télécharger la facture"
                className="p-2 rounded-lg text-[var(--primary)] hover:bg-[var(--primary-bg)] cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Payée", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    open: { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    void: { label: "Annulée", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    draft: { label: "Brouillon", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    uncollectible: { label: "Impayée", cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const cfg = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function CancelConfirmModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 id="cancel-title" className="text-lg font-bold text-[var(--text-primary)]">
            Êtes-vous sûr ?
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          Votre abonnement sera annulé à la fin de la période en cours. Vous pouvez nous indiquer la raison
          (optionnel) — ça nous aide à améliorer le service.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Pourquoi nous quittez-vous ? (optionnel)"
          className="w-full px-3 py-2.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl outline-none focus:bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
        />
        <div className="flex flex-col sm:flex-row-reverse gap-2 mt-5">
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onConfirm(reason.trim());
              setSubmitting(false);
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl cursor-pointer transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirmer l&apos;annulation
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] bg-white border border-[var(--border)] hover:bg-[var(--surface)] rounded-xl cursor-pointer transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
