"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Shield,
  PenLine,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Building2,
  Phone,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Quote, SignatureType, getSignatureLabel } from "@/types";
import { QuoviLogo } from "@/components/shared/QuoviLogo";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Signature badge ──────────────────────────────────────────────────────────

const SIG_BADGE: Record<SignatureType, { label: string; icon: React.ElementType; classes: string }> = {
  simple: {
    label: "Signature simple",
    icon: PenLine,
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  email_confirmed: {
    label: "Signature + confirmation email",
    icon: Mail,
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  yousign: {
    label: "Signature certifiée eIDAS",
    icon: Shield,
    classes: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

// ─── Main SignatureClient ─────────────────────────────────────────────────────

type Step = "view" | "signing" | "email_confirm" | "success";

export function SignatureClient({ quote }: { quote: Quote }) {
  const [step, setStep] = useState<Step>("view");
  const [showItems, setShowItems] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(quote.client?.name ?? "");
  const [signerChecked, setSignerChecked] = useState(false);
  const [email, setEmail] = useState(quote.client?.email ?? "");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yousignUrl, setYousignUrl] = useState<string | null>(null);

  const sigType = quote.signatureType;
  const badge = SIG_BADGE[sigType];
  const BadgeIcon = badge.icon;

  const isSignatureReady =
    sigType === "simple"
      ? (signatureData !== null || (signerName.trim().length > 2 && signerChecked))
      : sigType === "email_confirmed"
      ? signatureData !== null
      : true; // yousign: always ready (redirects)

  const handleSign = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/quotes/${quote.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureType: sigType,
          signatureData,
          signerName,
          signerEmail: email,
          publicToken: quote.publicToken,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue");

      if (sigType === "yousign" && json.signingUrl) {
        setYousignUrl(json.signingUrl);
        window.location.href = json.signingUrl;
        return;
      }

      if (sigType === "email_confirmed") {
        setStep("email_confirm");
        return;
      }

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmail = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/sign/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmationCode, publicToken: quote.publicToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Code incorrect");
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--emerald)]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
            Devis signé avec succès !
          </h1>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
            Votre signature a été enregistrée pour le devis{" "}
            <strong>{quote.number}</strong> d'un montant de{" "}
            <strong>{formatCurrency(quote.total)}</strong>.
          </p>
          <div className="space-y-3 text-sm text-left">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[var(--emerald)] mt-0.5 flex-shrink-0" />
              <span className="text-emerald-800">
                Un email de confirmation avec le devis signé a été envoyé à <strong>{email}</strong>
              </span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[var(--primary)] mt-0.5 flex-shrink-0" />
              <span className="text-indigo-800">
                <strong>{quote.artisan?.company ?? quote.artisan?.name}</strong> a été notifié et génèrera votre facture sous peu.
              </span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-center">
            <QuoviLogo size={24} />
          </div>
        </div>
      </div>
    );
  }

  // ── Email confirmation screen ───────────────────────────────────────────────
  if (step === "email_confirm") {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Confirmez par email</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Un code de confirmation a été envoyé à <strong>{email}</strong>. Saisissez-le ci-dessous
            pour valider votre signature.
          </p>

          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Code à 6 chiffres"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center text-2xl font-bold tracking-[0.4em] px-4 py-4 border-2 border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:outline-none transition-colors"
            />

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleConfirmEmail}
              disabled={confirmationCode.length < 6 || loading}
              className="w-full py-4 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Valider ma signature
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <QuoviLogo size={28} />
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold", badge.classes)}>
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Artisan card */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">
                Émis par
              </p>
              <p className="font-bold text-[var(--text-primary)]">
                {quote.artisan?.company ?? quote.artisan?.name}
              </p>
              {quote.artisan?.company && (
                <p className="text-sm text-[var(--text-secondary)]">{quote.artisan.name}</p>
              )}
              {quote.artisan?.phone && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1">
                  <Phone className="w-3 h-3" />
                  {quote.artisan.phone}
                </p>
              )}
              {quote.artisan?.siret && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
                  <Building2 className="w-3 h-3" />
                  SIRET {quote.artisan.siret}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-[var(--text-muted)] font-semibold mb-1">Devis</p>
              <p className="font-bold text-[var(--text-primary)]">{quote.number}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                <span className="flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />
                  Valable jusqu'au {formatDate(quote.validUntil)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Quote items (collapsible on mobile) */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <button
            onClick={() => setShowItems((v) => !v)}
            className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="font-semibold text-[var(--text-primary)]">
                Détail du devis ({quote.items.length} lignes)
              </span>
            </div>
            {showItems ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>

          {showItems && (
            <div className="px-5 pb-5 space-y-2 border-t border-[var(--border-light)]">
              <div className="pt-4 space-y-2">
                {quote.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start py-2 border-b border-[var(--border-light)] last:border-0"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {item.description}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)] flex-shrink-0">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                  <span>Sous-total HT</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                  <span>TVA {quote.taxRate}%</span>
                  <span>{formatCurrency(quote.taxAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total — always visible */}
          <div className="flex justify-between items-center px-5 py-4 bg-[var(--primary)] rounded-b-2xl">
            <span className="font-bold text-white">Total TTC</span>
            <span className="text-2xl font-extrabold text-white">
              {formatCurrency(quote.total)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
              Notes
            </p>
            <p className="text-sm text-amber-800 leading-relaxed">{quote.notes}</p>
          </div>
        )}

        {/* Signature zone */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 space-y-5">
          <div>
            <h2 className="font-bold text-[var(--text-primary)] mb-1">
              {sigType === "yousign"
                ? "Signature certifiée eIDAS requise"
                : "Signez le devis"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {sigType === "simple" &&
                "Dessinez votre signature dans le cadre ci-dessous ou saisissez votre nom."}
              {sigType === "email_confirmed" &&
                "Dessinez votre signature, puis confirmez par email pour finaliser."}
              {sigType === "yousign" &&
                "Ce devis dépasse 5 000 €. Vous serez redirigé vers YouSign pour une signature électronique certifiée eIDAS."}
            </p>
          </div>

          {/* Simple: canvas + name checkbox */}
          {sigType === "simple" && (
            <div className="space-y-4">
              <SignaturePad onSignatureChange={setSignatureData} />
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--text-muted)] font-medium">ou</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Saisissez vos nom et prénom"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none transition-colors"
                />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signerChecked}
                    onChange={(e) => setSignerChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    J'accepte les conditions de ce devis et je reconnais que ma signature électronique
                    a la même valeur légale qu'une signature manuscrite.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Email confirmed: canvas + email */}
          {sigType === "email_confirmed" && (
            <div className="space-y-4">
              <SignaturePad onSignatureChange={setSignatureData} />
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Adresse email pour confirmation
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--primary)] focus:outline-none transition-colors"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                  Un code de confirmation vous sera envoyé pour valider la signature.
                </p>
              </div>
            </div>
          )}

          {/* YouSign: info only */}
          {sigType === "yousign" && (
            <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
              <Shield className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-violet-800">Signature eIDAS via YouSign</p>
                <p className="text-xs text-violet-600">
                  Vous serez redirigé vers la plateforme YouSign pour signer électroniquement ce
                  document avec valeur légale certifiée en Europe.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={!isSignatureReady || loading}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer",
              isSignatureReady && !loading
                ? "bg-[var(--primary)] hover:bg-[var(--primary-dark)] shadow-lg hover:shadow-xl"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!loading && sigType === "yousign" && <ExternalLink className="w-4 h-4" />}
            {!loading && sigType !== "yousign" && <PenLine className="w-4 h-4" />}
            {loading
              ? "Traitement en cours…"
              : sigType === "yousign"
              ? "Signer avec YouSign"
              : sigType === "email_confirmed"
              ? "Signer et confirmer par email"
              : "Signer le devis"}
          </button>
        </div>

        {/* Legal footer */}
        <div className="text-center space-y-2 pb-8">
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <Shield className="w-3.5 h-3.5" />
            <span>
              {sigType === "yousign"
                ? "Signature certifiée conforme au règlement eIDAS (UE n°910/2014)"
                : "Signature électronique à valeur légale — conforme au droit français"}
            </span>
          </div>
          <div className="flex justify-center mt-4">
            <QuoviLogo size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}
