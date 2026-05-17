"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

export interface AffiliateRow {
  id: string;
  name: string;
  email: string;
  promo_code: string;
  tier: "standard" | "vip" | "strategic";
  status: "pending" | "active" | "paused" | "terminated";
  commission_rate: number;
  duration_months: number;
  total_clients_referred: number;
  total_revenue_generated: number;
  total_commission_paid: number;
  created_at: string;
}

interface Props {
  initialAffiliates: AffiliateRow[];
}

export function AffiliatesAdminClient({ initialAffiliates }: Props) {
  const [affiliates, setAffiliates] =
    useState<AffiliateRow[]>(initialAffiliates);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(form: FormData) {
    setCreating(true);
    try {
      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          promo_code: form.get("promo_code"),
          tier: form.get("tier") ?? "standard",
          commission_rate: Number(form.get("commission_rate") ?? 0.3),
          duration_months: Number(form.get("duration_months") ?? 12),
          status: "active",
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        alert(`Erreur : ${json.error ?? res.statusText}`);
        return;
      }
      const json = (await res.json()) as { affiliate: AffiliateRow };
      setAffiliates((prev) => [json.affiliate, ...prev]);
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(id: string, status: AffiliateRow["status"]) {
    const res = await fetch(`/api/affiliates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setAffiliates((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Affiliés
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {affiliates.length} affilié{affiliates.length > 1 ? "s" : ""}{" "}
              enregistré{affiliates.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nouvel affilié
          </button>
        </header>

        {showForm && (
          <form
            action={handleCreate}
            className="mb-6 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom *">
                <input name="name" required className={inputCls} />
              </Field>
              <Field label="Email *">
                <input
                  name="email"
                  type="email"
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Promo code (auto si vide)">
                <input
                  name="promo_code"
                  placeholder="Ex : AGENCE-PARIS"
                  className={inputCls}
                />
              </Field>
              <Field label="Tier">
                <select name="tier" defaultValue="standard" className={inputCls}>
                  <option value="standard">Standard</option>
                  <option value="vip">VIP</option>
                  <option value="strategic">Strategic</option>
                </select>
              </Field>
              <Field label="Commission rate (0–1)">
                <input
                  name="commission_rate"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  defaultValue="0.3"
                  className={inputCls}
                />
              </Field>
              <Field label="Durée (mois)">
                <input
                  name="duration_months"
                  type="number"
                  min="1"
                  defaultValue="12"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Création…" : "Créer"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--text-muted)]"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] text-left text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Affilié</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Clients</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {affiliates.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-[13px] text-[var(--text-muted)]"
                  >
                    Aucun affilié.
                  </td>
                </tr>
              ) : (
                affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {a.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {a.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">
                      {a.promo_code}
                    </td>
                    <td className="px-4 py-3 text-[12px]">{a.tier}</td>
                    <td className="px-4 py-3 text-[12px]">
                      {(a.commission_rate * 100).toFixed(0)}% /{" "}
                      {a.duration_months}m
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {a.total_clients_referred}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {a.total_revenue_generated.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {a.total_commission_paid.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={(e) =>
                          handleStatusChange(
                            a.id,
                            e.target.value as AffiliateRow["status"],
                          )
                        }
                        className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-[11px]"
                      >
                        <option value="pending">pending</option>
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="terminated">terminated</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
