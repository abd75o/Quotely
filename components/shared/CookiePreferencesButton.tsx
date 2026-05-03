"use client";

import { Settings2 } from "lucide-react";
import { resetConsent } from "@/lib/cookie-consent";

/**
 * Bouton "Modifier mes préférences" affiché sur /cookies.
 * Vide le consentement stocké et notifie le CookieBanner via un event
 * custom (pas besoin de reload — la bannière re-vérifie son état).
 */
export function CookiePreferencesButton() {
  function handleClick() {
    resetConsent();
    // Le storage event ne se déclenche pas dans le même onglet ; on emet
    // un event custom écouté par CookieBanner pour ré-afficher la bannière.
    window.dispatchEvent(new Event("quotely:cookie-consent-reset"));
    // Scroll en bas pour que l'utilisateur voie la bannière apparaître
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] bg-white border border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--primary)] rounded-xl cursor-pointer transition-colors"
    >
      <Settings2 className="w-4 h-4" />
      Modifier mes préférences cookies
    </button>
  );
}
