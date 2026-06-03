/**
 * Normalisation des noms À L'AFFICHAGE.
 *
 * On NE touche PAS à la base : la saisie brute de l'utilisateur est conservée
 * (intention préservée, recherche insensible à la casse côté API déjà gérée par
 * lib/format/title-case.ts au write-time). Ces helpers ne servent qu'au rendu,
 * pour qu'un devis pro affiche "Marc DUPONT" / "Linkity" même quand la donnée a
 * été créée hors des routes /api (ex. via les tools d'Émile qui insèrent en
 * direct).
 *
 * Règles métier :
 *   - Prénom        → 1re lettre de chaque mot/segment en majuscule, reste en
 *                     minuscule. "JEAN-PIERRE" → "Jean-Pierre", "marie anne" →
 *                     "Marie Anne".
 *   - Nom de famille→ TOUT en majuscule. "dupont" → "DUPONT",
 *                     "De la Fontaine" → "DE LA FONTAINE".
 *   - Raison sociale→ casse de titre avec préservation des acronymes de forme
 *                     juridique (SAS/SARL/EURL/SASU/SCI…). "sas bati-pro" →
 *                     "SAS Bati-Pro", "linkity" → "Linkity". (délégué à
 *                     titleCaseFr, source unique de la logique acronymes.)
 */

import { titleCaseFr } from "@/lib/format/title-case";

/** Capitalise un segment unique : 1re lettre majuscule (fr), reste minuscule. */
function capitaliseSegment(segment: string): string {
  if (!segment) return segment;
  const lower = segment.toLocaleLowerCase("fr");
  return lower.charAt(0).toLocaleUpperCase("fr") + lower.slice(1);
}

/** Capitalise un mot en gérant les composés à tiret ("jean-pierre"). */
function capitaliseWordWithHyphens(word: string): string {
  if (!word.includes("-")) return capitaliseSegment(word);
  return word.split("-").map(capitaliseSegment).join("-");
}

/**
 * Prénom : chaque mot (et chaque segment de mot composé) capitalisé.
 * Préserve les espaces multiples d'origine via un split sur les runs d'espaces.
 */
export function formatFirstName(input: string | null | undefined): string {
  if (input == null) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : capitaliseWordWithHyphens(part)))
    .join("");
}

/** Nom de famille : intégralement en majuscules (locale fr). */
export function formatLastName(input: string | null | undefined): string {
  if (input == null) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  return trimmed.toLocaleUpperCase("fr");
}

/**
 * Raison sociale / nom d'entreprise : casse de titre + acronymes préservés.
 * Réutilise titleCaseFr pour ne pas dupliquer la liste d'acronymes.
 */
export function formatCompanyName(input: string | null | undefined): string {
  return titleCaseFr(input);
}

/**
 * Nom complet d'une personne : "Marc DUPONT". Tolère un prénom ou un nom
 * manquant (renvoie alors la seule partie présente, correctement formatée).
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return [formatFirstName(firstName), formatLastName(lastName)]
    .filter(Boolean)
    .join(" ");
}

/**
 * Nom affichable d'un client à partir de la forme courante { first_name, name }.
 * - prénom présent → personne physique → "Marc DUPONT" (name = nom de famille).
 * - sinon          → `name` est une raison sociale / mononyme → casse de titre
 *   ("linkity" → "Linkity"), JAMAIS tout en majuscules (on ne sait pas que
 *   c'est un patronyme).
 */
export function formatClientName(client: {
  first_name?: string | null;
  name?: string | null;
}): string {
  const first = client.first_name?.trim() ?? "";
  const name = client.name?.trim() ?? "";
  if (first) return formatFullName(first, name);
  return formatCompanyName(name);
}
