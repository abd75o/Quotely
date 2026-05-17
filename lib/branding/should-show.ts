/**
 * Single source of truth for whether the "Devis créé avec Quovi" branding
 * appears on client-facing materials (PDF, email, public signature page).
 *
 * - free / starter → branding is FORCED on (viral acquisition channel).
 * - pro            → branding is on by default, can be hidden via the
 *                    `hide_branding` toggle in /dashboard/parametres/profil.
 * - anything else (unknown plan, null) → fail safe by SHOWING the branding.
 */
export function shouldShowBranding(
  plan: string | null | undefined,
  hideBranding: boolean | null | undefined,
): boolean {
  if (plan === "free" || plan === "starter") return true;
  if (plan === "pro") return !hideBranding;
  return true;
}
