"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift, Users } from "lucide-react";

interface ReferralRow {
  id: string;
  status: "pending" | "converted" | "rewarded";
  first_payment_date: string | null;
  created_at: string;
}

interface ApiResponse {
  referral_code: string | null;
  referral_credits_months: number;
  referrals: ReferralRow[];
  counts: {
    pending: number;
    converted: number;
    rewarded: number;
    total: number;
  };
}

export function ParrainageClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/referrals");
        if (!res.ok) return;
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shareUrl =
    typeof window !== "undefined" && data?.referral_code
      ? `${window.location.origin}/?parrain=${data.referral_code}`
      : "";

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // best-effort
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] px-6 py-10">
        <p className="text-center text-sm text-[var(--text-muted)]">
          Chargement…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--surface)] px-6 py-10">
        <p className="text-center text-sm text-red-600">
          Impossible de charger ton parrainage.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Parrainage
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">
            Invite tes amis, gagne des mois gratuits
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Pour chaque artisan qui s&apos;inscrit avec ton lien et passe à un
            plan payant, tu gagnes <strong>1 mois gratuit</strong>. Ton filleul
            aussi.
          </p>
        </header>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Ton code
          </p>
          <p className="mt-1 font-mono text-3xl font-bold text-[var(--primary)]">
            {data.referral_code ?? "—"}
          </p>
          {shareUrl && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-gray-50 p-3">
              <span className="flex-1 truncate font-mono text-[12px] text-[var(--text-secondary)]">
                {shareUrl}
              </span>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            icon={Users}
            label="Amis invités"
            value={data.counts.total}
            sub={`${data.counts.pending} en attente`}
          />
          <Stat
            icon={Check}
            label="Conversions"
            value={data.counts.converted + data.counts.rewarded}
            sub={`${data.counts.rewarded} récompensées`}
          />
          <Stat
            icon={Gift}
            label="Mois gagnés"
            value={data.referral_credits_months}
            sub="appliqués au prochain renouvellement"
          />
        </div>

        {data.referrals.length > 0 && (
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              Historique
            </h2>
            <ul className="divide-y divide-[var(--border)]">
              {data.referrals.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-[12px] text-[var(--text-secondary)]">
                    Inscrit le{" "}
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-bg)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">{sub}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ReferralRow["status"] }) {
  const map: Record<ReferralRow["status"], { label: string; cls: string }> = {
    pending: {
      label: "En attente",
      cls: "bg-amber-50 text-amber-700",
    },
    converted: {
      label: "Converti",
      cls: "bg-blue-50 text-blue-700",
    },
    rewarded: {
      label: "Récompensé",
      cls: "bg-emerald-50 text-emerald-700",
    },
  };
  const m = map[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
