/**
 * Gestion du consentement cookies — logique pure, sans JSX.
 *
 * Stockage localStorage uniquement (le composant CookieBanner appellera
 * ces helpers depuis le client). Toutes les fonctions sont SSR-safe :
 * elles renvoient une valeur neutre si window n'existe pas.
 *
 * Pour invalider tous les consentements existants (par exemple si la
 * politique cookies change), incrémenter CONSENT_VERSION : la
 * comparaison de version dans hasConsented() forcera une re-demande.
 */

export const STORAGE_KEY = "quotely-cookie-consent";
export const CONSENT_VERSION = "1.0";

export interface CookieConsent {
  /** Toujours true — les cookies essentiels ne peuvent pas être désactivés. */
  essential: true;
  analytics: boolean;
  marketing: boolean;
  /** ISO 8601 — date à laquelle l'utilisateur a fait son choix. */
  timestamp: string;
  /** Version de la politique au moment du consentement. */
  version: string;
}

const isBrowser = (): boolean => typeof window !== "undefined";

export function getConsent(): CookieConsent | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.timestamp !== "string" ||
      typeof parsed.version !== "string"
    ) {
      return null;
    }
    return {
      essential: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      timestamp: parsed.timestamp,
      version: parsed.version,
    };
  } catch {
    return null;
  }
}

export function setConsent(
  consent: Partial<Pick<CookieConsent, "analytics" | "marketing">>
): CookieConsent | null {
  if (!isBrowser()) return null;
  const next: CookieConsent = {
    essential: true,
    analytics: !!consent.analytics,
    marketing: !!consent.marketing,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function hasConsented(): boolean {
  const c = getConsent();
  return !!c && c.version === CONSENT_VERSION;
}

export function resetConsent(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore (mode privé / quota)
  }
}
