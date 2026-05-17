"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface SignatureClientProps {
  quoteId: string;
  signatureToken: string;
  signedAt: string | null;
  signedName: string | null;
  clientEmail: string;
  color: string;
}

export function SignatureClient({
  quoteId,
  signatureToken,
  signedAt: initialSignedAt,
  signedName: initialSignedName,
  clientEmail,
  color,
}: SignatureClientProps) {
  const [signedAt, setSignedAt] = useState<string | null>(initialSignedAt);
  const [signedName, setSignedName] = useState<string | null>(
    initialSignedName,
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(clientEmail);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    void fetch(`/api/quotes/${quoteId}/track-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature_token: signatureToken }),
    }).catch(() => {});
  }, [quoteId, signatureToken]);

  if (signedAt) {
    return (
      <div
        className="rounded-2xl border bg-white p-6 text-center"
        style={{
          borderColor: "#A7F3D0",
          backgroundColor: "#F0FDF4",
        }}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="text-base font-bold text-emerald-900">
          Devis signé
          {signedName ? ` par ${signedName}` : ""}
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          Signature enregistrée le{" "}
          {new Date(signedAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    );
  }

  const canSubmit =
    fullName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    accepted &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_token: signatureToken,
          full_name: fullName.trim(),
          email: email.trim(),
        }),
      });
      if (res.status === 409) {
        const json = (await res.json().catch(() => ({}))) as {
          signed_at?: string;
          full_name?: string;
        };
        setSignedAt(json.signed_at ?? new Date().toISOString());
        setSignedName(json.full_name ?? fullName.trim());
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? `Erreur ${res.status}`);
        return;
      }
      const json = (await res.json()) as {
        signed_at?: string;
        full_name?: string;
      };
      setSignedAt(json.signed_at ?? new Date().toISOString());
      setSignedName(json.full_name ?? fullName.trim());
    } catch (err) {
      setError((err as Error).message ?? "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-bold text-[#0F172A]">Signer le devis</h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Renseignez votre nom complet pour valider le devis. Votre signature
        a la même valeur juridique qu&apos;une signature manuscrite.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]"
            htmlFor="fullName"
          >
            Nom et prénom *
          </label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex : Marie Dupont"
            required
            className="h-10 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-[14px] outline-none focus:border-[var(--brand)] focus:ring-2"
            style={{
              ["--tw-ring-color" as string]: `${color}33`,
            }}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]"
            htmlFor="email"
          >
            Email *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.fr"
            required
            className="h-10 w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-[14px] outline-none focus:border-[var(--brand)] focus:ring-2"
            style={{
              ["--tw-ring-color" as string]: `${color}33`,
            }}
          />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2 text-[13px] text-[#374151]">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB]"
          style={{ accentColor: color }}
        />
        <span>
          J&apos;accepte les conditions de ce devis et reconnais qu&apos;une
          signature électronique a la même valeur qu&apos;une signature
          manuscrite.
        </span>
      </label>

      {error && (
        <p className="mt-3 text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: color }}
      >
        {submitting ? "Signature en cours…" : "Signer le devis"}
      </button>
    </form>
  );
}
