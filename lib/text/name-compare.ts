// Comparaison de noms — module PUR (aucune dépendance, pas d'alias @/), pour
// valider le signataire sur /sign sans casser l'exécution Node des tests.
// Tolérant sur la FORME (casse, accents, espaces, tirets), STRICT sur le FOND
// (une lettre de différence sur un token => pas de correspondance).

/**
 * Forme canonique pour comparaison : minuscules, sans accents/diacritiques,
 * tirets -> espaces, espaces multiples réduits, trim.
 * "Jean-Pierre  DÉ Dupont" -> "jean pierre de dupont".
 */
export function normalizeForCompare(input: string | null | undefined): string {
  if (input == null) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritiques
    .toLowerCase()
    .replace(/[-\u2013\u2014]/g, " ") // tirets composés -> espaces
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(input: string | null | undefined): string[] {
  const n = normalizeForCompare(input);
  return n ? n.split(" ").filter(Boolean) : [];
}

/**
 * Le nom saisi par le signataire correspond-il au destinataire enregistré ?
 * Compare l'ENSEMBLE des tokens (ordre indifférent : "Marie Dupont" ==
 * "Dupont Marie"), chaque token devant être strictement égal après
 * normalisation. "Dupond" != "Dupont". false si l'un des deux est vide.
 */
export function signerNameMatches(
  typedFullName: string | null | undefined,
  expectedFirstName: string | null | undefined,
  expectedLastName: string | null | undefined,
): boolean {
  const expected = nameTokens(
    `${expectedFirstName ?? ""} ${expectedLastName ?? ""}`,
  );
  const got = nameTokens(typedFullName);
  if (expected.length === 0 || got.length === 0) return false;
  // Égalité de multiset : tri + jointure par espace (les tokens normalisés ne
  // contiennent jamais d'espace, jointure sans ambiguïté).
  return [...expected].sort().join(" ") === [...got].sort().join(" ");
}
