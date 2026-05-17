"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, Save, Sparkles } from "lucide-react";
import { TextField } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { humanizeError } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";

interface ProfilFormState {
  first_name: string;
  last_name: string;
  telephone: string;
  /** Email is sourced from Supabase auth and not editable here — changing
   *  it requires a Supabase re-verification flow that lives in /auth. */
  email: string;
}

const EMPTY: ProfilFormState = {
  first_name: "",
  last_name: "",
  telephone: "",
  email: "",
};

export function ProfilForm() {
  const [form, setForm] = useState<ProfilFormState>(EMPTY);
  const [initial, setInitial] = useState<ProfilFormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Branding section lives outside the main form save — toggling it PATCHes
  // immediately so the user gets instant feedback. Plan gates visibility.
  const [plan, setPlan] = useState<string | null>(null);
  const [hideBranding, setHideBranding] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, telephone, plan, hide_branding")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const next: ProfilFormState = {
        first_name: (profile?.first_name as string | null) ?? "",
        last_name: (profile?.last_name as string | null) ?? "",
        telephone: (profile?.telephone as string | null) ?? "",
        email: user.email ?? "",
      };
      setForm(next);
      setInitial(next);
      setPlan((profile?.plan as string | null) ?? "free");
      setHideBranding(Boolean(profile?.hide_branding));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleHideBranding(next: boolean) {
    if (plan !== "pro" || brandingSaving) return;
    const previous = hideBranding;
    setHideBranding(next);
    setBrandingSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hide_branding: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          fieldErrors?: Record<string, string>;
        };
        throw body.fieldErrors?.hide_branding || body.error
          ? new Error(
              body.fieldErrors?.hide_branding ??
                body.error ??
                `HTTP ${res.status}`,
            )
          : new Error(`HTTP ${res.status}`);
      }
      toastSuccess(
        next
          ? "Mention Quovi masquée sur vos documents."
          : "Mention Quovi réaffichée sur vos documents.",
      );
    } catch (err) {
      // Roll back the optimistic flip so the UI matches reality.
      setHideBranding(previous);
      console.error("[ProfilForm] branding toggle failed:", err);
      toastError(humanizeError(err, "Impossible de mettre à jour la préférence."));
    } finally {
      setBrandingSaving(false);
    }
  }

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  const valid = form.first_name.trim().length > 0 && form.last_name.trim().length > 0;

  function update<K extends keyof ProfilFormState>(key: K, value: ProfilFormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving || !dirty) return;
    setSaving(true);
    try {
      // Route through /api/profile so the server-side allowlist enforces the
      // safe column set — never accidentally write plan/subscription columns.
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          telephone: form.telephone.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw body.error ? body : new Error(`HTTP ${res.status}`);
      }
      setInitial(form);
      toastSuccess("Profil mis à jour");
    } catch (err) {
      console.error("[ProfilForm] save failed:", err);
      toastError(humanizeError(err, "Impossible d'enregistrer le profil."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      <Section title="Identité">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="profil-firstname"
            label="Prénom *"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            placeholder="Sophie"
            autoComplete="given-name"
            required
          />
          <TextField
            id="profil-lastname"
            label="Nom *"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            placeholder="Martin"
            autoComplete="family-name"
            required
          />
        </div>

        <TextField
          id="profil-phone"
          label="Téléphone"
          type="tel"
          value={form.telephone}
          onChange={(e) => update("telephone", e.target.value)}
          placeholder="06 12 34 56 78"
          autoComplete="tel"
        />
      </Section>

      <Section title="Compte">
        <TextField
          id="profil-email"
          label="Email"
          type="email"
          value={form.email}
          disabled
          hint="L'email est lié à votre compte. Pour le modifier, contactez le support."
        />
      </Section>

      <Section title="Branding">
        {plan === "pro" ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Masquer la mention Quovi sur mes devis et emails
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                En tant qu&apos;utilisateur Pro, vous pouvez masquer toute
                mention de Quovi sur les documents envoyés à vos clients.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hideBranding}
              aria-label="Masquer la mention Quovi"
              disabled={brandingSaving}
              onClick={() => toggleHideBranding(!hideBranding)}
              className={
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                (hideBranding
                  ? "bg-[var(--primary)]"
                  : "bg-gray-300")
              }
            >
              <span
                className={
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " +
                  (hideBranding ? "translate-x-6" : "translate-x-1")
                }
              />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Masquer la mention Quovi sur mes devis et emails
                </p>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Disponible avec le plan Pro. Vos clients voient actuellement
                « Devis créé avec Quovi » sur les PDF et la page de signature.
              </p>
            </div>
            <Link
              href="/dashboard/parametres/facturation"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Passer Pro
            </Link>
          </div>
        )}
      </Section>

      <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-white/95 backdrop-blur border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          {dirty && (
            <p className="text-xs text-[var(--text-muted)] mr-auto">
              Modifications non enregistrées
            </p>
          )}
          <button
            type="submit"
            disabled={saving || !dirty || !valid}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-colors shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-[var(--border)] p-5 sm:p-6 mb-4">
      <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
