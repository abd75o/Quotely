"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Euro,
  FileText,
  Plus,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { NewQuoteButton } from "@/components/quotes/NewQuoteButton";
import { MonthlyQuoteCounter } from "@/components/dashboard/MonthlyQuoteCounter";
import { SignatureScore } from "@/components/dashboard/SignatureScore";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PendingQuotesList } from "@/components/dashboard/PendingQuotesList";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { cn } from "@/lib/utils";
import type { DashboardStats, DashboardQuote } from "@/app/dashboard/page";

interface DashboardHomeProps {
  stats: DashboardStats;
  recentQuotes: DashboardQuote[];
  welcome: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: { label: "En attente", icon: Clock, className: "bg-amber-50 text-amber-700" },
  signed: { label: "Signé", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" },
  refused: { label: "Refusé", icon: XCircle, className: "bg-red-50 text-red-700" },
  invoiced: { label: "Facturé", icon: CheckCircle2, className: "bg-blue-50 text-blue-700" },
  draft: { label: "Brouillon", icon: AlertCircle, className: "bg-gray-100 text-gray-600" },
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "indigo",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: "indigo" | "emerald" | "amber" | "violet";
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
      <div
        className={cn(
          "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          colors[color]
        )}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] leading-none">
          {value}
        </p>
        {sub && <p className="text-[11px] sm:text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function QuoteRow({ quote }: { quote: DashboardQuote }) {
  const cfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const date = new Date(quote.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      href={`/dashboard/quotes/${quote.id}`}
      className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-[var(--primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {quote.client_name}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {quote.number} · {date}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className={cn(
            "hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
            cfg.className
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </span>
        <span className="text-sm font-bold text-[var(--text-primary)]">
          {quote.total.toLocaleString("fr-FR")} €
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export function DashboardHome({ stats, recentQuotes, welcome }: DashboardHomeProps) {
  const { isStarter, isPro, isLoading } = useUserPlan();

  return (
    <div className="max-w-4xl mx-auto">
      {welcome && (
        <div className="relative mb-6 p-5 bg-gradient-to-r from-[var(--primary)] to-indigo-700 rounded-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white mb-0.5">Bienvenue sur Quovi !</p>
              <p className="text-sm text-indigo-200">
                Votre essai Pro de 14 jours est actif. Créez votre premier devis maintenant.
              </p>
            </div>
            <NewQuoteButton className="flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--primary)] text-sm font-bold rounded-xl hover:bg-gray-50 cursor-pointer transition-colors shadow-md flex-shrink-0">
              <Plus className="w-4 h-4" />
              Créer un devis
            </NewQuoteButton>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight truncate">
            Tableau de bord
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 truncate">
            Vue d&apos;ensemble de votre activité ce mois-ci.
          </p>
          {/* Compteur mensuel : visible uniquement pour Starter (géré par le composant) */}
          <MonthlyQuoteCounter className="mt-1" />
        </div>
        <NewQuoteButton className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm cursor-pointer flex-shrink-0">
          <Plus className="w-4 h-4" />
          Créer un devis
        </NewQuoteButton>
      </div>

      {/* Score de signature : Pro uniquement */}
      {isPro && <SignatureScore className="mb-5" />}

      {/* 4 stats — pour tous */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          label="Devis créés"
          value={stats.totalQuotes.toString()}
          sub="Ce mois-ci"
          icon={FileText}
          color="indigo"
        />
        <StatCard
          label="Signés"
          value={`${stats.signatureRate}%`}
          sub={
            stats.signedQuotes > 0
              ? `${stats.signedQuotes} devis signé${stats.signedQuotes > 1 ? "s" : ""}`
              : "Pas encore"
          }
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          label="En attente"
          value={stats.pendingQuotes.toString()}
          sub={stats.pendingQuotes > 0 ? "À relancer" : "Aucun en attente"}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Chiffre d'affaires"
          value={`${stats.revenue.toLocaleString("fr-FR")} €`}
          sub="Devis signés du mois"
          icon={Euro}
          color="violet"
        />
      </div>

      {/* Pro : graphique d'évolution */}
      {isPro && <RevenueChart className="mb-6" />}

      {/* Pro : devis à relancer */}
      {isPro && <PendingQuotesList className="mb-6" />}

      {/* Derniers devis — pour tous */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Derniers devis</h2>
          {recentQuotes.length > 0 && (
            <Link
              href="/dashboard/quotes"
              className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
            >
              Voir tout
            </Link>
          )}
        </div>

        {recentQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 bg-[var(--primary-bg)] rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-[var(--primary)]" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1.5">
              Aucun devis pour l&apos;instant
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-6">
              Créez votre premier devis en 30 secondes et envoyez-le directement à votre client.
            </p>
            <NewQuoteButton className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-bold rounded-xl transition-colors shadow-sm cursor-pointer">
              <Plus className="w-4 h-4" />
              Créer mon premier devis
            </NewQuoteButton>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {recentQuotes.map((q) => (
              <QuoteRow key={q.id} quote={q} />
            ))}
          </div>
        )}
      </div>

      {/* Banner upgrade : Starter uniquement (n'apparaît qu'après que le plan est chargé) */}
      {!isLoading && isStarter && <UpgradeBanner />}

      {/* Petit indicateur en cas de Pro/trial : récap */}
      {isPro && (
        <p className="text-center text-xs text-[var(--text-muted)] mt-2">
          <TrendingUp className="inline w-3 h-3 mr-1 text-[var(--primary)]" />
          Vous bénéficiez de toutes les fonctionnalités Pro.
        </p>
      )}
    </div>
  );
}
