"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cookie, Settings2, X } from "lucide-react";
import {
  hasConsented,
  setConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";
import { cn } from "@/lib/utils";

type View = "compact" | "preferences";

interface Choices {
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_CHOICES: Choices = { analytics: false, marketing: false };

export function CookieBanner() {
  // visible vaut null tant qu'on n'a pas vérifié localStorage côté client.
  // Cela évite tout flash de bannière pendant l'hydratation.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("compact");
  const [choices, setChoices] = useState<Choices>(DEFAULT_CHOICES);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(!hasConsented());

    function onStorage(e: StorageEvent) {
      if (e.key === "quotely-cookie-consent") {
        setVisible(!hasConsented());
      }
    }
    function onCustom() {
      setVisible(!hasConsented());
      setView("compact");
      setChoices(DEFAULT_CHOICES);
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("quotely:cookie-consent-reset", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("quotely:cookie-consent-reset", onCustom);
    };
  }, []);

  // Echap ferme la vue préférences (revient à la vue compact)
  useEffect(() => {
    if (view !== "preferences") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setView("compact");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view]);

  // Focus trap dans la vue préférences
  useEffect(() => {
    if (view !== "preferences") return;
    const root = containerRef.current;
    if (!root) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleTab);
    // Place le focus sur le premier élément
    const first = root.querySelector<HTMLElement>('button, input, [href]');
    first?.focus();
    return () => document.removeEventListener("keydown", handleTab);
  }, [view]);

  function persist(c: Pick<CookieConsent, "analytics" | "marketing">) {
    setConsent(c);
    setVisible(false);
  }

  function acceptAll() {
    persist({ analytics: true, marketing: true });
  }

  function rejectAll() {
    persist({ analytics: false, marketing: false });
  }

  function savePreferences() {
    persist(choices);
  }

  if (visible !== true) return null;

  return (
    <>
      {/* Backdrop léger en vue préférences pour focus visuel */}
      {view === "preferences" && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] motion-safe:animate-fade-in"
        />
      )}

      <div
        ref={containerRef}
        role="dialog"
        aria-modal={view === "preferences"}
        aria-label="Consentement aux cookies"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-desc"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-white border-t border-[var(--border)]",
          "shadow-[0_-4px_24px_rgba(0,0,0,0.08)]",
          "motion-safe:animate-cookie-slide-up"
        )}
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {view === "compact" ? (
            <CompactView
              onAcceptAll={acceptAll}
              onRejectAll={rejectAll}
              onCustomize={() => {
                setChoices(DEFAULT_CHOICES);
                setView("preferences");
              }}
            />
          ) : (
            <PreferencesView
              choices={choices}
              onChange={setChoices}
              onBack={() => setView("compact")}
              onSave={savePreferences}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes cookieSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes cookieFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .motion-safe\\:animate-cookie-slide-up {
          animation: cookieSlideUp 0.3s ease-out both;
        }
        .motion-safe\\:animate-fade-in {
          animation: cookieFadeIn 0.2s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-cookie-slide-up,
          .motion-safe\\:animate-fade-in { animation: none; }
        }
      `}</style>
    </>
  );
}

// ─── Vue compact ────────────────────────────────────────────────────────────

function CompactView({
  onAcceptAll,
  onRejectAll,
  onCustomize,
}: {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onCustomize: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-[var(--primary-bg)] items-center justify-center flex-shrink-0">
          <Cookie className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <div className="min-w-0">
          <h2
            id="cookie-banner-title"
            className="font-display text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1"
          >
            🍪 Vos cookies, votre choix
          </h2>
          <p
            id="cookie-banner-desc"
            className="text-sm text-[var(--text-secondary)] leading-relaxed"
          >
            Quotely utilise uniquement des cookies essentiels au fonctionnement du site. Si à
            l&apos;avenir nous ajoutons des cookies analytiques, vous pourrez les contrôler ici.{" "}
            <Link
              href="/cookies"
              className="text-[var(--primary)] hover:underline font-medium"
            >
              En savoir plus
            </Link>
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 lg:flex-shrink-0">
        <button
          type="button"
          onClick={onRejectAll}
          aria-label="Refuser tous les cookies non essentiels"
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)] rounded-xl cursor-pointer transition-colors"
        >
          Tout refuser
        </button>
        <button
          type="button"
          onClick={onCustomize}
          aria-label="Personnaliser mes choix de cookies"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl cursor-pointer transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          Personnaliser
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          aria-label="Accepter tous les cookies"
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
        >
          Tout accepter
        </button>
      </div>
    </div>
  );
}

// ─── Vue préférences ────────────────────────────────────────────────────────

function PreferencesView({
  choices,
  onChange,
  onBack,
  onSave,
}: {
  choices: Choices;
  onChange: (c: Choices) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div className="max-h-[85vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2
            id="cookie-banner-title"
            className="font-display text-xl font-bold text-[var(--text-primary)]"
          >
            Préférences cookies
          </h2>
          <p
            id="cookie-banner-desc"
            className="text-sm text-[var(--text-secondary)] mt-1"
          >
            Choisissez les cookies que vous acceptez. Vous pourrez modifier ces choix à tout moment
            depuis la page{" "}
            <Link href="/cookies" className="text-[var(--primary)] hover:underline">
              cookies
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          aria-label="Fermer le panneau de préférences"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <ul className="space-y-3 mb-6">
        <ToggleRow
          id="cookie-essential"
          label="Cookies essentiels"
          description="Nécessaires au fonctionnement du site (authentification, sécurité). Ils ne peuvent pas être désactivés."
          checked
          disabled
          alwaysOnLabel="Toujours actifs"
          onChange={() => {}}
        />
        <ToggleRow
          id="cookie-analytics"
          label="Cookies analytiques"
          description="Nous aident à comprendre comment vous utilisez le site pour l'améliorer (anonymisé)."
          checked={choices.analytics}
          onChange={(v) => onChange({ ...choices, analytics: v })}
        />
        <ToggleRow
          id="cookie-marketing"
          label="Cookies marketing"
          description="Permettent d'afficher des publicités pertinentes sur d'autres sites. Quotely n'en utilise pas actuellement."
          checked={choices.marketing}
          onChange={(v) => onChange({ ...choices, marketing: v })}
        />
      </ul>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2.5 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Revenir à la vue principale"
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl cursor-pointer transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={onSave}
          aria-label="Enregistrer mes choix de cookies"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl cursor-pointer transition-colors shadow-sm"
        >
          Enregistrer mes choix
        </button>
      </div>
    </div>
  );
}

// ─── Toggle minimaliste ─────────────────────────────────────────────────────

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  alwaysOnLabel,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  alwaysOnLabel?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className={cn(
              "block font-semibold text-[var(--text-primary)] text-sm",
              !disabled && "cursor-pointer"
            )}
          >
            {label}
          </label>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
            {description}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            aria-label={`${label} — ${checked ? "activé" : "désactivé"}${disabled ? " (verrouillé)" : ""}`}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
              checked ? "bg-[var(--emerald)]" : "bg-[var(--border)]",
              disabled
                ? "opacity-60 cursor-not-allowed"
                : "cursor-pointer hover:opacity-90"
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                checked ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
          {disabled && alwaysOnLabel && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {alwaysOnLabel}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
