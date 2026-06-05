// Regroupement par mois pour les listes du dashboard (devis, factures).
// Pur rendu : trie les éléments par date décroissante puis les groupe par mois,
// du plus récent au plus ancien. Aucun groupe vide n'est produit (on ne groupe
// que ce qui existe). Réutilisé par /dashboard/devis et /dashboard/factures.

export interface MonthGroup<T> {
  /** Clé stable "YYYY-MM" pour le key React et le tri. */
  key: string;
  /** Libellé affiché, ex. "Juin 2026" (1ʳᵉ lettre capitalisée). */
  label: string;
  items: T[];
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(d: Date): string {
  const raw = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Groupe `items` par mois calendaire, en se basant sur la date renvoyée par
 * `getDate`. Les éléments sans date valide sont regroupés en fin de liste sous
 * une section neutre (« Sans date ») plutôt que d'être perdus.
 */
export function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>();
  const NO_DATE = "0000-00";

  // Trie d'abord par date desc (les dates invalides en dernier).
  const sorted = [...items].sort((a, b) => {
    const da = new Date(getDate(a) ?? "").getTime();
    const db = new Date(getDate(b) ?? "").getTime();
    const va = Number.isNaN(da) ? -Infinity : da;
    const vb = Number.isNaN(db) ? -Infinity : db;
    return vb - va;
  });

  for (const item of sorted) {
    const raw = getDate(item);
    const date = raw ? new Date(raw) : null;
    const valid = date && !Number.isNaN(date.getTime());
    const key = valid ? monthKey(date) : NO_DATE;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: valid ? monthLabel(date) : "Sans date",
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(item);
  }

  // Sections triées par clé desc ("Sans date" = 0000-00 → toujours en dernier).
  return [...groups.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}
