// Public-ish affiliate dashboard. The code in the URL acts as a magic token:
// anyone with the link can view this affiliate's stats. Treat it the same as
// a quote signature link — no auth required, but the URL is unguessable.

import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function AffiliateDashboardPage({ params }: Props) {
  const { code } = await params;
  const supabase = getSupabaseAdmin();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select(
      "id, name, email, promo_code, tier, status, commission_rate, duration_months, total_clients_referred, total_revenue_generated, total_commission_paid, created_at",
    )
    .eq("promo_code", code)
    .maybeSingle();

  if (!affiliate) notFound();

  const { data: referrals } = await supabase
    .from("affiliate_referrals")
    .select("id, referred_user_id, signup_date, first_payment_date, status")
    .eq("affiliate_id", affiliate.id)
    .order("signup_date", { ascending: false })
    .limit(50);

  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("id, month_year, amount_due, amount_paid, paid_at")
    .eq("affiliate_id", affiliate.id)
    .order("month_year", { ascending: false })
    .limit(12);

  const referralList = referrals ?? [];
  const commissionList = commissions ?? [];

  const totalDue = commissionList.reduce(
    (s, c) => s + Number(c.amount_due ?? 0),
    0,
  );
  const totalPaid = commissionList.reduce(
    (s, c) => s + Number(c.amount_paid ?? 0),
    0,
  );

  return (
    <div className="min-h-screen bg-[var(--surface)] px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Programme d&apos;affiliation Quovi
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)]">
            Bonjour {affiliate.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Code : <span className="font-mono">{affiliate.promo_code}</span> ·
            Tier {affiliate.tier} · Commission{" "}
            {(affiliate.commission_rate * 100).toFixed(0)}% pendant{" "}
            {affiliate.duration_months} mois
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Clients référés" value={affiliate.total_clients_referred} />
          <Stat
            label="Revenu généré"
            value={`${Number(affiliate.total_revenue_generated).toFixed(2)} €`}
          />
          <Stat
            label="Commission payée"
            value={`${Number(affiliate.total_commission_paid).toFixed(2)} €`}
          />
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
            Filleuls récents
          </h2>
          {referralList.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Personne ne s&apos;est encore inscrit avec ton code.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {referralList.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-mono text-[12px] text-[var(--text-secondary)]">
                    {r.referred_user_id.slice(0, 8)}…
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {new Date(r.signup_date).toLocaleDateString("fr-FR")} ·{" "}
                    {r.first_payment_date ? "💳 payé" : "en attente"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
            Commissions (12 derniers mois)
          </h2>
          {commissionList.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Aucune commission encore calculée.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)]">
                {commissionList.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-mono text-[12px]">{c.month_year}</span>
                    <span className="text-[12px]">
                      {Number(c.amount_due).toFixed(2)} € due ·{" "}
                      {Number(c.amount_paid).toFixed(2)} € payée
                      {c.paid_at
                        ? ` (${new Date(c.paid_at).toLocaleDateString("fr-FR")})`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between text-[12px] font-semibold">
                <span>Total dû : {totalDue.toFixed(2)} €</span>
                <span>Total payé : {totalPaid.toFixed(2)} €</span>
              </div>
            </>
          )}
        </section>

        <p className="text-center text-[11px] text-[var(--text-muted)]">
          Pour toute question, contacte l&apos;équipe Quovi.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
